const binderPosHostsMap = {
    "gufgames.myshopify.com": "Guf",
    "the-hall-of-heroes.myshopify.com": "The Hall of Heroes",
    "cracking-singles.myshopify.com": "Cracking Singles",
    "next-level-games-ringwood.myshopify.com": "Games Portal",
    "good-games-townhall.myshopify.com": "Good Games National",
    "good-games-morley.myshopify.com": "Good Games Morley",
    "good-games-cannington.myshopify.com": "Good Games Cannington",
    "good-games-adelaide-sa.myshopify.com": "Good Games Adelaide",
    "unplugged-games.myshopify.com": "Unplugged Games"
}

const mtgMateMap = {
    "mtgmate.com.au": "MTGMate"
}

window.addEventListener('load', function() {
    var hosts = {...mtgMateMap, ...binderPosHostsMap};
    var checkboxDiv = document.getElementById("checkboxes-list");
    var savedToggles = JSON.parse(localStorage.getItem("frantic-search-toggles"));
    var useToggles = savedToggles && (Object.keys(savedToggles).length === Object.keys(hosts).length);
    for (const [url, name] of Object.entries(hosts)) {
        var li = this.document.createElement("li");
        li.className = "checkbox-list-member";
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = url;
        checkbox.checked = useToggles ? savedToggles[url] : true;

        var label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.appendChild(document.createTextNode(name));
        li.appendChild(checkbox);
        li.appendChild(label);
        checkboxDiv.appendChild(li);
    }
});

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

    spinnerShow();

    var input = $("#input").val().split("\n");
    var requestList = parseInput(input);

    var toggles = {};

    for (var li of $("#checkboxes-list").children()) {
        toggles[`${li.firstElementChild.id}`] = li.firstElementChild.checked;
    }

    localStorage.setItem("frantic-search-toggles", JSON.stringify(toggles));

    var promises = [];

    for (var vendorUrl of Object.keys(binderPosHostsMap)) {
        if (toggles[vendorUrl]) {
            promises.push(createBinderPosPromise(requestList, vendorUrl));
        }
    }

    if (toggles["mtgmate.com.au"]) {
        promises.push(createMtgMatePromise(requestList));
    }

    Promise.all(promises).then((results) => {

        //<String, List<Card>>, with card names as keys
        var cardsMap = {};

        results.flat().forEach(card => {
            if (!cardsMap.hasOwnProperty(card["name"])){
                cardsMap[card["name"]] = [];
            }
            cardsMap[card["name"]].push(card);
        });

        deduplicateEntries(cardsMap);
        rankPrices(cardsMap);
        createOrUpdateTable(Object.values(cardsMap).flat());

        spinnerHide();
    });
}

function parseInput(input) {
    var requestList = [];
    
    for (const line of input) {
        if (!line || line.length === 0)
            continue;
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

    return requestList;
}

async function createMtgMatePromise(requestList) {

    var requestString = _.chain(requestList)
                            .map((card) => `${card["quantity"]} ${card["card"]}`)
                            .reduce((s1, s2) => `${s1}\n${s2}`)
                            .value();

    return $.get("https://fs-cors-anywhere.herokuapp.com/https://www.mtgmate.com.au/cards/decklist_results?utf8=✓&decklist=" +
                encodeURIComponent(requestString))
            .then(r => {
                return processMtgMateResponse(r);
            });
}

async function processMtgMateResponse(response) {

    var list = [];

    //There are two tbodys in the response for some reason, #2 has our data
    $(response).find("tbody").last()
        //For each child elem that's a table row - i.e., for each row
        .children("tr").each(function () { 
            var name = $(this).find("td.card-name").find("a").text().trim();
            if (name.indexOf("(") > 0) {
                name = name.substring(0, name.indexOf("(") - 1);
            }

            list.push({
                "name": name,
                "availableQuantity": parseInt($(this).find("td.available-quantity").text().trim()),
                "price": $(this).find("td.price").text().trim(),
                "setName": $(this).find("td.magic-set-name").find("a").text().trim(),
                "foil": $(this).find("td.card-name").find("span.finish").text().trim() == "Nonfoil" ? "No" : "Yes",
                "vendorName": "MTGMate",
                "priceRank": 0,
                "internalPrice": parseFloat($(this).find("td.price").text().trim().slice(1))
            });
    })

    return list;
}

async function createBinderPosPromise(requestList, host) {

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
        return processBinderPosResponse(r);
    });
}

async function processBinderPosResponse(response) {
    return _.chain(response)
            .flatMap((entry) => _.map(entry["products"], (card) => {
                //variants is always a single-element array
                var variants = card["variants"][0];

                return {
                    "name": card["name"],
                    "availableQuantity": variants["quantity"],
                    "price": `$${variants["price"].toFixed(2)}`,
                    "setName": card["setName"],
                    "foil": variants["title"].toLowerCase().match(/foil/) ? "Yes" : "No",
                    "vendorName": entry["vendorName"],
                    "priceRank": 0,
                    "internalPrice": variants["price"]
                };
            }))
            .value();
}

function rankPrices(cardsMap) {
    //Mutates in place
    Object.values(cardsMap).forEach(function(arr) {
        arr.sort(function (a, b) { 
            if (a["internalPrice"] < b["internalPrice"])
                return -1;
            if (a["internalPrice"] == b["internalPrice"])
                return 0;
            else return 1;
        });
        var lastRank = 0;
        for (var i = 0; i < arr.length; i++) {
            var priceRank;
            if (i > 0 && arr[i]["internalPrice"] == arr[i - 1]["internalPrice"]) {
                priceRank = lastRank;
            } else {
                priceRank = lastRank + 1;
            }
            arr[i]["priceRank"] = priceRank;
            lastRank = priceRank;
        }
    })
}

//Helps with shops like Guf that have multiple identical entries
function deduplicateEntries(cardsMap) {
    
    for (var [cardName, cards] of Object.entries(cardsMap)) {
        for (var i = 0; i < cards.length - 1; i++) {
            for (var j = i + 1; j < cards.length; j++) {
                if (!cards[i] || !cards[j] || cards[i]["internalPrice"] != cards[j]["internalPrice"]) {
                    break;
                }

                if (cards[i]["setName"] == cards[j]["setName"] &&
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
            { "data": "name", "width": "20%" },
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

function spinnerShow() {
    $("#working").css("animation-play-state", "running");
    $("#working").css("visibility", "visible");
}

function spinnerHide() {
    $("#working").css("animation-play-state", "paused");
    $("#working").css("opacity", "0");
    $("#working").css("visibility", "hidden");
}