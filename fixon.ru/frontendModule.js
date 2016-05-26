var frontendModule = (function () {
    'use strict';
    var self;

    return {
        init: function () {
            self = this;

            // Показать всплывающее окно предпросмотра товара
            $('.quickLogin-js').on('submit', function (e) {
                e.preventDefault();
                self.quickLogin(this);
            });

            // Инициализация маски ввода телефона
            $('.phoneMask-js').mask('+7(999)999-99-99');

            // Инициализация маски ввода даты
            $.mask.definitions['D'] = '[0-3]';
            $.mask.definitions['M'] = '[0-1]';
            $.mask.definitions['Y'] = '[1-2]';
            $('.dateMask-js').mask('D9.M9.Y999');

            // В мобильной версии показать полностью алфавит
            $('.abcDummy-js').on('click', function () {
                this.style.display = 'none';
                $('.abc-js').show();
            });

            // Клик на подгрузить больше элементов
            $(document.body).on('click', '.paginatorMore-js', function (e) {
                e.preventDefault();
                self.loadMoreAjaxPaginator(this.getAttribute('data-href'));
            });

            // Красивые скролбары
            $('.scrollbar-js').scrollbar();

            // Попап преимущества магазина
            $('.advantage-js').on('click', function () {
                var advantage = this.getAttribute('data-advantage'),
                    url = $('.advantages-js').data('url');

                self.showAdvantagePopup(advantage, url);
            });

            // Плавно раскрывает скрытый текст
            $('.showMoreText-js').on('click', function () {
                var $button = $(this),
                    $box = $button.closest('.showMoreTextWrapper-js'),
                    currentHeight = $box.innerHeight(),
                    fullHeight = $box.css('height', 'auto').height();

                $box.css('height', currentHeight)
                    .animate({height: fullHeight}, 400, function () {
                        $button.remove();
                    });
            });

            // Прогрузка фото только после того как они попадают во вьюпорт
            $('img.lazyload-js').lazyload(appConfig.lazyload);

            // Большой баннер слайдер на главной
            self.jumbotronInit($('.jumbotron-js'));

            // Скролл вверх
            $.scrollUp({
                scrollText: ''
            });

            $('.fancybox-js').fancybox();

            $(document.body).on('click', '.productDescription-js', function () {
                self.descriptionSlideToggle($(this));
            });

            $('.exampleSearch-js').on('click', function (e) {
                e.preventDefault();
                self.submitSearchWithValue($(this).closest('form'), this.value);
            })
        },

        /**
         * Обработчик формы быстрого входа
         * @param form Нода формы с данными для входа
         */
        quickLogin: function (form) {
            $.ajax({
                method: 'post',
                url: form.action,
                data: $(form).serialize(),
                success: function (response) {
                    if (response.result === 'success') {
                        $('#userAccountMobile').collapse('hide');
                        $('.loginButton-js').hide();
                        $('.registration-js').hide();
                        $('.userAccountButton-js').addClass('auth');
                        $('.mobileAuthForm-js').hide();
                        $('.mobileAuthMenu-js').show();
                        $('.personal-js').show();
                        $('.logoutButton-js').show();
                    }
                    toastr[response.result](response.message);
                },
                error: function () {
                    toastr.error('Что-то пошло не так');
                },
                beforeSend: function() {
                    $(form).find('[type=submit]').addClass('loading').attr('disabled', 'disabled');
                },
                complete: function() {
                    $(form).find('[type=submit]').removeClass('loading').removeAttr('disabled');
                }/*,
                timeout: 7000*/
            });
        },

        /**
         * Подгрузит записей вместо якоря пэйджинатора
         * @param url string Адрес откуда грузить html
         */
        loadMoreAjaxPaginator: function (url) {
            var $anchor = $('.paginatorAnchor-js');

            $.ajax({
                url: url,
                success: function(response) {
                    $(response).insertBefore($anchor);
                    $anchor.remove();
                    // Прогрузка фото только после того как они попадают во вьюпорт
                    $('img.lazyload-js').lazyload(appConfig.lazyload);

                    if (window.history && window.history.pushState) {
                        history.pushState(null, document.title, url);
                    }
                },
                error: function() {
                    toastr.error('Что-то пошло не так');
                },
                beforeSend: function () {
                    $anchor.addClass('paginationLoading');
                },
                complete: function () {
                    $anchor.removeClass('paginationLoading');
                }
            });
        },

        /**
         * Показывает модальное окно преимущества магазина
         * @param advantage string Slug преимущества
         * @param url string Путь до вёрстки
         */
        showAdvantagePopup: function (advantage, url) {
            $.ajax({
                url: url + '?advantage=' + advantage,
                success: function (response) {
                    var temp = document.createElement('div');

                    temp.innerHTML = response;

                    var oldModal = $('.advatagePopup-js');

                    // Удалим если есть предыдущее окно
                    if (oldModal) {
                        oldModal.remove();
                    }
                    document.body.appendChild(temp.firstChild);

                    $('.advatagePopup-js').modal('show');
                },
                error: function () {
                    toastr.error('Что-то пошло не так');
                },
                timeout: 7000
            });
        },

        /**
         * Инициализация большого баннера на главной. Стартовый номер слайда выбирается случайно.
         * @param $node Нода слайдера
         */
        jumbotronInit: function ($node) {
            if (!$node) {
                return;
            }
            var slidesQty = $node.children().length,
                min = 0,
                max = slidesQty - 1,
                randomStart = Math.floor(Math.random() * (max - min + 1)) + min;

            $node.bxSlider({
                slideWidth: 705,
                startSlide: randomStart
            });
        },

        /**
         * Анимация для описания внутри карточки товара
         * @param $node
         */
        descriptionSlideToggle: function ($node) {
            if ($node.hasClass('expandDescription')) {
                $node.removeClass('expandDescription')
            } else {
                $node.addClass('expandDescription')
            }
        },

        /**
         * Засабмитит поисковую форму с предоставленным значением
         * @param $form
         * @param value
         */
        submitSearchWithValue: function ($form, value) {
            $form.find('#q').val(value);
            $form.submit();
        }
    }
})();