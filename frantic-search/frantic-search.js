var waitForJQuery = setInterval(function () {
    if (typeof $ != 'undefined') {

        wakeUp();

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
    var requestMap = [];

    for (const line of input) {
        var quantity, cardName;
        quantity = line.match(/\b[0-9]*/)[0];
        if (!quantity) {
            quantity = "1";
            cardName = line;
        } else {
            cardName = line.substring(line.indexOf(quantity) + quantity.length + 1, line.length);
        }
        requestMap.push({"name": cardName, "quantity": quantity});
    }

    var request = {cards: requestMap};

    $.ajax({
        type: 'POST',
        url: "https://i89sxzytwe.execute-api.us-east-1.amazonaws.com/Prod/search",
        data: JSON.stringify(request),
        contentType: "application/json",
        dataType: "json"
    }).done(function (r) {
        $("#working").css("visibility", "hidden");
        createOrUpdateTable(r);
    })
}

function createOrUpdateTable(data) {

    const flattenedData = [];
    for (const vendor of data["vendors"]) {
        for (const card of vendor["cardDetails"]) {
            card["foil"] = card["foil"] == true ? "Yes" : "No";
            //currency formatting - toFixed() adds decimal places
            card["price"] = `$${card["price"].toFixed(2)}`;
            flattenedData.push(card);
        }
    }

    if ($.fn.dataTable.isDataTable('#example')) {
        $('#example').DataTable().destroy();
    }

    $('#example').DataTable( {
        "processing": true,
        "data": flattenedData,
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

    $('#example').css("visibility", "visible");
}

function wakeUp() {
    $.ajax({
        type: 'POST',
        url: "https://i89sxzytwe.execute-api.us-east-1.amazonaws.com/Prod/search",
        data: JSON.stringify([]),
        contentType: "application/json",
        dataType: "json"
    })
}