// jQuery Document Ready Function
$(document).ready(function() {

    // Homepage JSON Data

    $.getJSON('robots/robot-list.json', function(data) {
        data = data.slice(0, 4);    // Reduces the number of robots displayed to 4
        var template = $('#robot-gallery-template').html();
        Mustache.parse(template);
        $('#robot-gallery').html(Mustache.render(template, data));
    });
    $.getJSON('community/sponsors/sponsor-list.json', function(data) {
        var template = $('#sponsors-template').html();
        Mustache.parse(template);
        $('#sponsors-container').html(Mustache.render(template, data));

        animatePage();
    });


    // Animations

    function animatePage() {
        var controller = new ScrollMagic.Controller();

        var robotGalleryTween = TweenMax.staggerFrom($('.robot'), 1.5, {opacity: 0, left: ($(window).width() - $('.robot').width()), ease: Power2.easeInOut}, 0.15);

        var robotGalleryScene = new ScrollMagic.Scene({
            triggerElement: '#home-news'
        })
            .setTween(robotGalleryTween)
            .addIndicators({name: "robot cards"})
            .addTo(controller);
    }
});