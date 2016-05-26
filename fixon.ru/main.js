$(function () {
    $('.item1').hover(function () {
        var
            elem = $(this),
            link1 = elem.find('.item1__fast_view'),
            link2 = elem.find('.item1__more')

        link1.removeClass('animated fast slideInLeft').addClass('slideInLeft animated fast').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
            $(this).removeClass('animated fast slideInLeft');
        })
        link2.removeClass('animated fast slideInRight').addClass('slideInRight animated fast').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
            $(this).removeClass('animated fast slideInRight');
        })
    }, function () {
        var
            elem = $(this),
            link1 = elem.find('.item1__fast_view'),
            link2 = elem.find('.item1__more')

        link1.removeClass('animated fast slideInLeft');
        link2.removeClass('animated fast slideInRight');
    })


    $('.left-sidebar-listing-collapse .title4').click(function(){
        var 
            elem = $(this),
            toggle = elem.next()

        elem.toggleClass('clicked')
        toggle.toggle()
    })

    var winWidth = $(window).width()
    if (winWidth < 481) {
        var listing_text = $('.listing_text')

        listing_text.addClass('toggle')

        $('.toggle_text').click(function (e) {
            e.preventDefault()
            var
                elem = $(this),
                block = elem.parent(),
                block_h = block.find('p').height()

            elem.hide()
            $(this).parent().animate({
                'height': block_h
            }, 250)
        })
    }

    $('#top_nav li.has_vipad>a').click(function (e) {
        e.preventDefault()

        var
            elem = $(this),
            li = elem.parent(),
            popup = li.find('.menu2'),
            popups = $('#top_nav .menu2'),
            li_items = $('#top_nav ul li.has_vipad')

        if (li.hasClass('active')) {
            li.removeClass('active')
            popup.hide()
            return
        }

        popups.hide()
        li_items.removeClass('active')

        li.toggleClass('active')
        popup.toggle()
    })

    $(document).click(function (event) {
        if ($(event.target).closest("#top_nav").length) return;
        $('#top_nav li').removeClass('active')
        $('#top_nav li .menu2').hide()
        event.stopPropagation();
    });

    $('.promocode-js').click(function(e){
        e.preventDefault();

        $(this).hide();
        $('.promocodeWrapper-js').show()
    })
})

// Код счётчика 60 секунд проведённых на сайте
$('body').activity({
    'achieveTime': 60,
    'testPeriod': 10,
    useMultiMode: 1,
    callBack: function (e) {
        ga('send', 'event', 'Activity', '60_sec');
        yaCounter4913701.reachGoal('60_sec');
    }
});