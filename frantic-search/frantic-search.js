const binderPosHostsMap = {
    "gufgames.myshopify.com": "Guf",
    "the-hall-of-heroes.myshopify.com": "The Hall of Heroes",
    "cracking-singles.myshopify.com": "Cracking Singles",
    "next-level-games-ringwood.myshopify.com": "Games Portal",
    "good-games-townhall.myshopify.com": "Good Games National",
    "good-games-morley.myshopify.com": "Good Games Morley",
    "good-games-cannington.myshopify.com": "Good Games Cannington"
}

var waitForJQuery = setInterval(function () {
    if (typeof $ != 'undefined') {

        $("#send-input").on("click", function(e) {
    
            e.preventDefault();
            doQuery();
        });

        clearInterval(waitForJQuery);
    }
}, 10);

function doQuery() {

    $("#working").css("visibility", "visible");

    var input = $("#input").val().split("\n");
    var requestList = [];

    for (const line of input) {
        var quantity, cardName;
        quantity = line.match(/\b[0-9]*/)[0];
        if (!quantity) {
            quantity = "1";
            cardName = line;
        } else {
            cardName = line.substring(line.indexOf(quantity) + quantity.length + 1, line.length);
        }
        cardName.trim();
        requestList.push({"card": cardName, "quantity": quantity});
    }

    var binderPosPromises = [];

    for (var vendorUrl of Object.keys(binderPosHostsMap)) {
        binderPosPromises.push(createBinderPosPromise(requestList, vendorUrl));
    }

    Promise.all(binderPosPromises).then((vendors) => {

        $("#working").css("visibility", "hidden");

        var binderPosMap = processBinderPosResponses(vendors);
        deduplicateEntries(binderPosMap);
        rankPrices(binderPosMap);
        createOrUpdateTable(Object.values(binderPosMap).flat());
    });
}

function createBinderPosPromise(requestList, host) {

    return $.ajax({
        type: 'POST',
        url: `https://portal.binderpos.com/external/shopify/decklist?storeUrl=${host}&type=mtg`,
        data: JSON.stringify(requestList),
        contentType: "application/json",
        dataType: "json"
    }).then(function (r) {
        //Nothing in the response tells us about the vendor, so embed this info while we still can
        //Saves having to use a map later
        r.forEach((v) => v["vendorName"] = binderPosHostsMap[host]);
        return r;
    });
}

function processBinderPosResponses(responses) {

    //<String, List<Card>>, with card names as keys
    var cardsMap = {};

    _.chain(responses)
        .flatMap()
        .flatMap((entry) => _.map(entry["products"], (card) => {
            card["vendorName"] = entry["vendorName"];
            return card;
        }))
        .map((card) => {
            //variants is always a single-element array
            var variants = card["variants"][0];

            return {
                "name": card["name"],
                "availableQuantity": variants["quantity"],
                "price": `$${variants["price"].toFixed(2)}`,
                "setName": card["setName"],
                "foil": variants["title"].toLowerCase().match(/foil/) ? "Yes" : "No",
                "vendorName": card["vendorName"],
                "priceRank": 0,
                "internalPrice": variants["price"]
            };
        })
        .value()
        .forEach(card => {
            if (!cardsMap.hasOwnProperty(card["name"])){
                cardsMap[card["name"]] = [];
            }
            cardsMap[card["name"]].push(card);
        });
    
    return cardsMap; 
}

function rankPrices(cardsMap) {
    //Mutates in place
    Object.values(cardsMap).forEach(function(arr) {
        arr.sort(function (a, b) { 
            if (a["internalPrice"] < b["internalPrice"])
                return -1;
            else return 1;
        });
        for (var i = 0; i < arr.length; i++) {
            var priceRank;
            if (i > 0 && arr[i]["internalPrice"] == arr[i - 1]["internalPrice"]) {
                priceRank = i;
            } else {
                priceRank = i + 1;
            }
            arr[i]["priceRank"] = priceRank;
        }
    })
}

//Helps with shops like Guf that have multiple identical entries
function deduplicateEntries(cardsMap) {
    
    for (var [cardName, cards] of Object.entries(cardsMap)) {
        for (var i = 0; i < cards.length - 1; i++) {
            for (var j = i + 1; j < cards.length; j++) {
                if (cards[i] && cards[j] &&
                cards[i]["setName"] == cards[j]["setName"] &&
                cards[i]["price"] == cards[j]["price"] &&
                cards[i]["foil"] == cards[j]["foil"] &&
                cards[i]["vendorName"] == cards[j]["vendorName"]) {
                        
                    cards[i]["availableQuantity"] += cards[j]["availableQuantity"];
                    cards[j] = undefined;
                }
            }
        }
        cardsMap[cardName] = _.compact(cards);
    }
}

function createOrUpdateTable(data) {

    if ($.fn.dataTable.isDataTable('#fs-table')) {
        $('#fs-table').DataTable().destroy();
    }

    $('#fs-table').DataTable( {
        "processing": true,
        "data": data,
        "columns": [
            { "data": "name" },
            { "data": "price" },
            { "data": "availableQuantity" },
            { "data": "setName" },
            { "data": "priceRank" },
            { "data": "foil" },
            { "data": "vendorName" }
        ]
    } );

    $('#fs-table').css("visibility", "visible");
}