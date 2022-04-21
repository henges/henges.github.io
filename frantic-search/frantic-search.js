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

    var input = $("#input").val().split("\n");
    var requestMap = [];

    for (const line of input) {
        var quantity, cardName;
        quantity = line.match(/\b[0-9]*/)[0];
        cardName = line.substring(line.indexOf(quantity) + quantity.length + 1, line.length);
        requestMap.push({"name": cardName, "quantity": quantity});
    }

    var request = {cards: requestMap};

    // $('#example').DataTable( {
    //     "processing": true,
    //     "ajax": {
    //         "url": "https://i89sxzytwe.execute-api.us-east-1.amazonaws.com/Prod/search",
    //         "type": "POST",
    //         "data": JSON.stringify(request),
    //         "contentType": "application/json",
    //         "dataType": "json"
    //     },
    //     "columns": [
    //         { "data": "name" },
    //         { "data": "hr.position" },
    //         { "data": "contact.0" },
    //         { "data": "contact.1" },
    //         { "data": "hr.start_date" },
    //         { "data": "hr.salary" }
    //     ]
    // } );

    $.ajax({
        type: 'POST',
        url: "https://i89sxzytwe.execute-api.us-east-1.amazonaws.com/Prod/search",
        data: JSON.stringify(request),
        contentType: "application/json",
        dataType: "json"
        
    }).done(function (r) {
        createTable(r);
    })
}

function createTable(data) {

    console.log(data);

    
}
