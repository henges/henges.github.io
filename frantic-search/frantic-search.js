var waitForJQuery = setInterval(function () {
    if (typeof $ != 'undefined') {

        console.log("i am executing");
        $("#send-input").on("click", function(e) {
    
            e.preventDefault();
            console.log("i am bound to the button");
            doQuery();
        });

        clearInterval(waitForJQuery);
    }
}, 10);

function doQuery() {

    var input = $("#input").val().split("\r\n");
    var requestMap = [];

    for (const line of input) {
        var quantity, cardName;
        quantity = line.match(/\b[0-9]*/)[0];
        cardName = line.substring(line.indexOf(quantity) + quantity.length + 1, line.length);
        requestMap.push({"card": cardName, "quantity": quantity});
    }

    var request = {cards: requestMap};

    $.ajax({
        type: 'POST',
        url: "https://i89sxzytwe.execute-api.us-east-1.amazonaws.com/Prod/search",
        // url: "http://localhost:3000/search",
        data: JSON.stringify(request),
        dataType: "json",
        contentType: "application/json",
        traditional: true
        
    }).done(function (r) {
        console.log(r);
    })
}