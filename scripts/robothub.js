
// ready function
$(document).ready(function() {
  console.log("test");
  $.getJSON('/robots/robot-list.json', function(data) {
      var template = $('#robot-cards-template').html();
      Mustache.parse(template);
      $('#robot-deck').html(Mustache.render(template, data));
  });
});
