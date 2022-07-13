// ready function
$(document).ready(function () {
  $.getJSON("/robots/robot-list.json", function (data) {
    let template = $("#robot-cards-template").html();
    Mustache.parse(template);
    $("#robot-deck").html(Mustache.render(template, data));
  });
});
