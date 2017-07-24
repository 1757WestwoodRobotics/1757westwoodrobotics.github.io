// jQuery Document Ready Function
$(document).ready(function() {

    // Smooth Scroll

    var scroll = new SmoothScroll('#home-scroll-down', {
        speed: 1500,
        easing: 'easeInOutCubic'

    });

    // Homepage JSON Data

    $.getJSON('/media/news/news-list.json', function(data) {
        data = data.slice(0, 3);    // Reduces the number of news articles displayed
        var template = $('#news-template').html();
        Mustache.parse(template);
        $('#news-gallery').html(Mustache.render(template, data));
    });

    $.getJSON('/robots/robot-list.json', function(data) {
        data = data.slice(0, 4);    // Reduces the number of robots displayed
        var template = $('#robot-gallery-template').html();
        Mustache.parse(template);
        $('#robot-gallery').html(Mustache.render(template, data));
    });

    $.getJSON('/community/sponsors/sponsor-list.json', function(data) {
        var template = $('#sponsors-template').html();
        Mustache.parse(template);
        $('#sponsors-container').html(Mustache.render(template, data));

        animateRobotGallery();
    });


    // Animations

    var controller = new ScrollMagic.Controller();

    function animateRobotGallery() {

        var robotGalleryTween = TweenMax.staggerFrom($('.robot'), 1.5, {opacity: 0, left: ($(window).width() - $('.robot').width()), ease: Power2.easeInOut}, 0.15);
        var robotGalleryScene = new ScrollMagic.Scene({
            triggerElement: '#home-robot-gallery',
            triggerHook: 'onEnter',
            reverse: false
        })
            .setTween(robotGalleryTween);
            // .addIndicators({name: "robot cards"});

        controller.addScene(robotGalleryScene);
    }
});