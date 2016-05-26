var catalogModule = (function () {
    'use strict';
    var self;

    return {
        init: function () {
            self = this;

            /* Ненахов - оживляем клик в айпаде */
            var
                ua = navigator.userAgent,
                event = (ua.match(/iPad/i)) ? "touchstart" : "click";


            // Показать всплывающее окно предпросмотра товара
            $(document.body).on(event, '.previewProduct-js', function (e) {
                e.preventDefault();
                self.showProductModal(this);
            });

            // Меняет количество товаров в строку в каталоге
            $(document.body).on('click', '.catalogView-js', function (e) {
                e.preventDefault();
                self.catalogProductsPerRow(this);
            });

            // Добавление в избранное
            $(document.body).on('click', '.favoriteAdd-js', function (e) {
                e.preventDefault();
                self.addToFavorite(this.getAttribute('data-productid'), this.getAttribute('data-userid'), this.getAttribute('data-type'));
            });

            // Заказать в один клик
            $(document.body).on('submit', '#quickOrderForm, #quickOrderFormModal', function (e) {
                e.preventDefault();
                self.quickOrder($(this).closest('.orderMakeBlock-js').find('.cartAdd-js'), $(this));
            });

            // Добавить товар в корзину
            $(document.body).on('submit', '.cartAdd-js, .cartAddModal-js', function (e) {
                e.preventDefault();
                var isModal = $(this).hasClass('cartAddModal-js');
                self.addToCart($(this), isModal);
            });

            self.cardSlidersInit(); // Инициализация слайдера в карточке товара

            self.cardZoomInit(); // Инициализация плагина для зума внутри карточки товара

            // Клик на чекбокс размеров
            $(document.body).on('click', '#size label, #size input, #sizeModal label, #sizeModal input', function () {
                self.resetCartAddButton($(this).closest('form'));
            });

            self.mainPageSlidersInit();
            
            $('.catalogSort-js').on('click', function () {
                var sortParam = this.getAttribute('data-sort-param');
                self.sortCatalog(sortParam);
            })
        },

        /**
         * Получит и запустит модальное окно с предпросмотром товара
         * @param previewButton Кнопка для показа всплывающего окна
         */
        showProductModal: function (previewButton) {
            var requestUrl = previewButton.getAttribute('href') || previewButton.getAttribute('data-href');

            $.ajax({
                url: requestUrl,
                success: function (response) {
                    var temp = document.createElement('div');

                    temp.innerHTML = response;
                    self.renderProductModal(temp.firstChild);
                },
                error: function () {
                    toastr.error('Что-то пошло не так');
                },
                timeout: 7000
            });
        },

        /**
         * Удалит предыдущее и отрисует новый контент модального окна с предпросмотром товара
         * @param node Нода для отрисовки в модальном окне
         */
        renderProductModal: function (node) {
            var oldModal = document.getElementById('productPreview');

            // Удалим если есть предыдущее окно
            if (oldModal) {
                oldModal.parentNode.removeChild(oldModal);
            }
            document.body.appendChild(node);
            var $modalNode = $('#productPreview');

            // Проблема с определением высоты блоков слайдером в невидимом блоке
            $modalNode.css({
                visibility: 'hidden',
                display: 'block'
            });

            /*** Инициализация всех необходимых плагинов в модалке ***/
            $modalNode.find('.cardImageSlider-js').bxSlider({
                pagerCustom: '#productPreview .cardImageSliderPager-js'
            });
            self.cardZoomInit($modalNode);

            $modalNode.find('.phoneMask-js').mask('+7(999)999-99-99');

            $modalNode.on('show.bs.modal', function () {
                $modalNode.css('visibility', '');
            });
            $modalNode.modal('show');
        },

        /**
         * Кнопка смены вида каталога. Поставит соответствующий класс каталогу с товарами.
         * Попросит сервер поставить правильную куку класс каталога, что бы запомнить выбор пользователя.
         * @param node Кнопка смены вида
         * @returns {boolean}
         */
        catalogProductsPerRow: function (node) {
            if ($(node).hasClass('active')) {
                return false;
            }
            var url = node.getAttribute('data-url'),
                $catalogNode = $('#listing1'),
                catalogClass = node.getAttribute('data-colclass');

            $.get(url); // Получим правильную куку от сервера

            $(node).addClass('active').siblings().not(node).removeClass('active');

            if ($catalogNode.data('colclass')) {
                $catalogNode.removeClass($catalogNode.data('colclass'));
            }
            $catalogNode.addClass(catalogClass).data('colclass', catalogClass);
        },

        /**
         * Добавит товар пользователю в избранное
         * @param productId int
         * @param userId int
         * @param targetType string
         */
        addToFavorite: function (productId, userId, targetType) {
            $.ajax({
                type: 'post',
                url: '/user/addfav',
                data: {userId: userId, productId: productId, targetType: targetType},
                success: function (response) {
                    toastr[response.result](response.message);
                },
                error: function () {
                    toastr.error('Неизвестная ошибка');
                }
            });
        },

        /**
         * Отправка запроса на быстрый заказ
         * @param $productFrom Нода формы товара
         * @param $quickOrderForm Нода быстрого заказа
         * @returns {boolean}
         */
        quickOrder: function ($productFrom, $quickOrderForm) {
            if (!self.isSizeChosen($productFrom.serializeArray())) {
                toastr.warning('Пожалуйста, выберите размер');
                return false;
            }

            $.ajax({
                type: 'post',
                url: $quickOrderForm.get(0).action,
                data: $quickOrderForm.serialize() + '&' + $productFrom.serialize(),
                success: function (response) {
                    if (response.result === 'success') {
                        $quickOrderForm.get(0).reset();
                        $productFrom.get(0).reset();
                        toastr.success(response.message);
                        $('#successOrderModal').modal('show');
                        if (response.admitadScript) {
                            eval(response.admitadScript);
                        }
                        if ($quickOrderForm.attr('id') === 'quickOrderFormModal') {
                            yaCounter4913701.reachGoal('questQuickOrder');
                        } else {
                            yaCounter4913701.reachGoal('userQuickOrder');
                        }
                    } else {
                        toastr.error(response.message);
                    }
                },
                error: function () {
                    toastr.error('Неизвестная ошибка');
                },
                beforeSend: function () {
                    $quickOrderForm.closest('.quickOrderWrapper-js').find('.quickOrder-js').addClass('loading').prop('disabled', true);
                    $quickOrderForm.closest('.quickOrderBlock-js').collapse('hide');
                },
                complete: function () {
                    $quickOrderForm.closest('.quickOrderWrapper-js').find('.quickOrder-js').removeClass('loading').prop('disabled', false);
                }
            });
        },

        /**
         * Проверит выбран ли хотя бы один размер из списка
         * @param productData array $.serrializeArray() формы товара
         * @returns {boolean}
         */
        isSizeChosen: function (productData) {
            var isSizeChosen = false;
            for (var i = 0, length = productData.length; i < length; i++) {
                if (productData[i]['name'] === 'size[]') {
                    isSizeChosen = true;
                    break;
                }
            }
            return isSizeChosen;
        },

        /**
         * Инициализация слайдеров в карточке товара
         */
        cardSlidersInit: function () {
            $('.cardImageSlider-js').bxSlider({
                responsive: true,
                pagerCustom: '.cardImageSliderPager-js'
            });

            if (document.querySelector('.sameBrandProductsSlider-js')) {
                var ajaxHandler = function ($tab) {
                        var $ph = $tab.find('.mainPageSliderPH-js'),
                            productId = $ph.data('productid'),
                            url = $ph.data('url');

                        $.ajax({
                            url: url,
                            data: {productid: productId},
                            success: function (response) {
                                $ph.replaceWith(response);
                                $tab.find('.bxslider').bxSlider({
                                    speed: 1000,
                                    minSlides: 1,
                                    maxSlides: 4,
                                    moveSlides: 4,
                                    infiniteLoop: false,
                                    slideWidth: 230,
                                    slideMargin: 5
                                });
                            },
                            error: function () {
                                toastr.error('Что-то пошло не так');
                            }
                        })
                    },
                    scrollHandler = function (e) {
                        var $window = $(window),
                            $el = $('.sameBrandProductsSlider-js');

                        if ($window.scrollTop() + $window.height() >= $el.offset().top) {
                            $window.off('scroll', scrollHandler);
                            ajaxHandler($el);
                        }
                    };

                $(window).on('scroll', scrollHandler);
            }
        },

        /**
         * Добавить товар в корзину аяксом
         * @param $form node Форма отправки товара в корзину
         * @param isModal boolean
         * @returns {boolean}
         */
        addToCart: function ($form, isModal) {
            if (!$form.hasClass('dontCheckSize-js') && !self.isSizeChosen($form.serializeArray())) {
                toastr.warning('Пожалуйста, выберите размер');
                return false;
            }

            var $submitButton = isModal ? $form.find('.addToCartModal-js') : $form.find('.addToCart-js');

            $.ajax({
                type: 'post',
                url: $form.attr('action'),
                data: $form.serialize(),
                success: function (response) {
                    if (response.result === 'success') {
                        $form.find('.goToCart-js').show();
                        $submitButton.hide();
                        $('.favoriteAdd-js').hide();
                        toastr.success(response.message);
                        cartModule.cartRefresh();
                    } else {
                        toastr.error(response.message);
                    }
                },
                error: function () {
                    toastr.error('Неизвестная ошибка');
                },
                beforeSend: function () {
                    $submitButton.addClass('loading').attr('disabled', 'disabled');
                },
                complete: function () {
                    $submitButton.removeClass('loading').removeAttr('disabled');
                }
            })
        },

        /**
         * Сбросит состояние кнопки добавить в корзину
         * @param $form jQuery Node
         */
        resetCartAddButton: function ($form) {
            if ($form.find('.goToCart-js:visible').length > 0) {
                $form.find('.goToCart-js').hide();
                $form.find('.addToCart-js').show();
            }
        },

        /**
         * Зум при наведении на картинку товара
         */
        cardZoomInit: function ($parent) {
            if (!$parent) {
                $parent = $(document.body);
            }
            $parent.find('.zoom-js').each(function (i, el) {
                $(el).zoom({
                    url: el.getAttribute('data-url'),
                    target: $parent.find('.zoomTargetCard-js').get(0),
                    onZoomIn: function () {
                        $parent.find('.zoomTargetCard-js').fadeIn(300);
                    },
                    onZoomOut: function () {
                        $parent.find('.zoomTargetCard-js').fadeOut(200);
                    },
                    touch: false
                });
            })
        },

        /**
         * Сынициализирует слайдеры новинок и скидок на главной.
         * Женский сразу, мужские будут подгружены и сынициализированы аяксом по клику на таб
         */
        mainPageSlidersInit: function () {
            var params = {
                speed: 1000,
                minSlides: 1,
                maxSlides: 4,
                moveSlides: 4,
                infiniteLoop: true,
                slideWidth: 230,
                slideMargin: 5
            };

            var ajaxHandler = function ($tab) {
                    var $ph = $tab.find('.mainPageSliderPH-js'),
                        type = $ph.data('type'),
                        gender = $ph.data('gender'),
                        url = $ph.data('url');

                    $.ajax({
                        url: url,
                        data: {type: type, gender: gender},
                        success: function (response) {
                            $ph.replaceWith(response);
                            $tab.find('.bxslider').bxSlider(params);
                        },
                        error: function () {
                            toastr.error('Что-то пошло не так');
                        }
                    })
                },
                tabHandler = function (e) {
                    $(e.target).off('shown.bs.tab', tabHandler);
                    ajaxHandler($(e.target.getAttribute('href')));
                },
                scrollNewHandler = function (e) {
                    var $window = $(window),
                        $el = $('#newForFemale');

                    if ($window.scrollTop() + $window.height() >= $el.offset().top) {
                        $window.off('scroll', scrollNewHandler);
                        ajaxHandler($el);
                    }
                },
                scrollSaleHandler = function (e) {
                    var $window = $(window),
                        $el = $('#saleForFemale');

                    if ($window.scrollTop() + $window.height() >= $el.offset().top) {
                        $window.off('scroll', scrollSaleHandler);
                        ajaxHandler($el);
                    }
                };

            if (document.getElementById('newForFemale')) {
                $(window).on('scroll', scrollNewHandler);
            }
            if (document.getElementById('saleForFemale')) {
                $(window).on('scroll', scrollSaleHandler);
            }

            $('#mainPageSliders').find('[href="#newForMale"], [href="#saleForMale"]').on('shown.bs.tab', tabHandler);
        },


        sortCatalog: function (sortParam) {

        }
    }
})();