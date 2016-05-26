var cartModule = (function () {
    'use strict';
    var self;

    return {
        init: function () {
            self = this;

            // Клик на плюс/минус счётчика количества товаров
            $('.minus-js, .plus-js').on('click', function () {
                var $wrapperNode = $(this).closest('.cartProduct-js'),
                    $qtyInput = $wrapperNode.find('.qty-js');

                if ($wrapperNode.hasClass('disabled-js')) {
                    return false;
                }
                self.changeQty($wrapperNode, $qtyInput, $(this).hasClass('minus-js') ? -1 : 1);
            });

            // Клик на удаление товара
            $('.deleteCartItem-js').on('click', function () {
                var $wrapperNode = $(this).closest('.cartProduct-js');

                if ($wrapperNode.hasClass('disabled-js')) {
                    return false;
                }
                self.deleteProduct($wrapperNode);
            });

            // Клик на активировать купон
            $('.couponButton-js').on('click', function () {
                self.activateCoupon($('.couponInput-js').val(), $(this));
            });

            // Сабмит формы авторизации/регистрации и заказа
            $('#orderLoginWEmail, #orderLoginWPhone, #orderRegistration').on('submit', function (e) {
                e.preventDefault();
                self.authBeforeOrder(this, this.querySelector('[type=submit]'));
            });

            // Сабмит формы заказа для авторизированных
            $('.orderButton-js').not('form .orderButton-js').on('click', function (e) {
                e.preventDefault();
                self.order(this);
            });

            // Если пытаются заказать без авторизации, прокрутить к форме регистрации
            // Если форма уже заполнена корректно, то засабмитит её
            $('.signUpAndOrder-js').on('click', function () {
                var $submit = $('.signUpAndOrderTarget-js'),
                    $form = $submit.closest('form'),
                    $nonAuthBlock = $('#nonAuthCart'),
                    orderRegistrationForm = document.getElementById('orderRegistration');

                if (orderRegistrationForm.checkValidity()) {
                    self.authBeforeOrder(orderRegistrationForm, document.body.querySelector('.signUpAndOrder-js'));
                } else {
                    $('html, body').animate({
                        scrollTop: $nonAuthBlock.offset().top
                    }, 600, 'swing', function () {
                        $form.find('input:visible').eq(0).focus();
                    });
                }
            });
        },

        /**
         * Добавит/убавит количество выбранного товара
         * @param $wrapperNode node Обёртка строки товара
         * @param $qtyInput node Инпут для хранения количества товара
         * @param delta int +1 или -1
         * @returns {boolean}
         */
        changeQty: function ($wrapperNode, $qtyInput, delta) {
            if ((+$qtyInput.val() + delta) === 0) {
                toastr.warning('Нельзя выбрать меньше 1го');
                return false;
            }

            $.ajax({
                url: '/cart/count',
                data: {
                    productId: $wrapperNode.data('productId'),
                    targetType: $wrapperNode.data('targetType'),
                    size: $wrapperNode.data('size'),
                    qty: delta
                },
                success: function (response) {
                    if (response.result === 'error') {
                        toastr.error(response.message);
                        return false;
                    }
                    $qtyInput.val(response.qty);
                    $wrapperNode.find('.positionTotal-js').html(response.positionTotal.toLocaleString('ru-RU'));

                    $('.yourBenefit-js').html(response.yourBenefit.toLocaleString('ru-RU'));
                    $('.total-js').html(response.total.toLocaleString('ru-RU'));
                    self.cartRefresh();
                },
                error: function () {
                    toastr.error('Что-то пошло не так');
                },
                beforeSend: function () {
                    $qtyInput.addClass('loading').attr('disabled', 'disabled');
                    $wrapperNode.addClass('disabled-js');
                },
                complete: function () {
                    $qtyInput.removeClass('loading').removeAttr('disabled');
                    $wrapperNode.removeClass('disabled-js');
                }/*,
                 timeout: 7000*/
            })
        },

        /**
         * Удалить строку из корзины
         * @param $wrapperNode node Обёртка строки в корзине
         */
        deleteProduct: function ($wrapperNode) {
            var data = {
                productId: $wrapperNode.data('productId'),
                targetType: $wrapperNode.data('targetType')
            };

            if ($wrapperNode.data('size')) {
                data.size = $wrapperNode.data('size');
            }

            $.ajax({
                url: '/cart/remove',
                data: data,
                success: function (response) {
                    if (response.result === 'error') {
                        toastr.error(response.message);
                        return false;
                    }

                    $wrapperNode.fadeOut(function () {
                        $wrapperNode.remove();
                    });
                    $('.yourBenefit-js').html(response.yourBenefit.toLocaleString('ru-RU'));
                    $('.total-js').html(response.total.toLocaleString('ru-RU'));
                    self.cartRefresh();
                },
                error: function () {
                    toastr.error('Что-то пошло не так');
                },
                beforeSend: function () {
                    $wrapperNode.addClass('disabled-js');
                },
                complete: function () {
                    $wrapperNode.removeClass('disabled-js');
                }/*,
                 timeout: 7000*/
            })
        },

        /**
         * Проверит и применит купон к заказу, перезагрузит страницу
         * @param code
         * @param $button
         * @returns {boolean}
         */
        activateCoupon: function (code, $button) {
            if (!code) {
                toastr.warning('Пожалуйста, введите купон');
                return false;
            }
            $.ajax({
                url: '/cart/checkcoupon',
                data: {
                    code: code
                },
                success: function (response) {
                    if (['warning', 'error'].indexOf(response.result) !== -1) {
                        toastr[response.result](response.message);
                        return false;
                    }

                    window.location.reload();
                },
                error: function () {
                    toastr.error('Что-то пошло не так');
                },
                beforeSend: function () {
                    $button.addClass('loading').attr('disabled', 'disabled');
                },
                complete: function () {
                    $button.removeClass('loading').removeAttr('disabled');
                }/*,
                 timeout: 7000*/
            })
        },

        /**
         * Обновит отображение мобильной и десктопной корзин в хедере
         */
        cartRefresh: function () {
            var mobileUrl = '/cart/cartmobile',
                desktopUrl = '/cart/cartdesktop';

            self.cartMobileRefresh(mobileUrl);
            self.cartDesktopRefresh(desktopUrl);
        },

        /**
         * Обновит отображение мобильной корзины в хедере
         * @param url string Адрес вёрстки обновления корзины
         */
        cartMobileRefresh: function (url) {
            $.ajax({
                url: url,
                success: function (response) {
                    $('#mobileCart').fadeOut(function () {
                        $(this).replaceWith(function () {
                            return $(response).hide().fadeIn().css({display: ''});
                        });
                    });
                },
                error: function () {
                    toastr.error('Что-то пошло не так');
                }/*,
                 timeout: 7000*/
            });
        },

        /**
         * Обновит отображение десктопной корзины в хедере
         * @param url string Адрес вёрстки обновления корзины
         */
        cartDesktopRefresh: function (url) {
            $.ajax({
                url: url,
                success: function (response) {
                    $('#desktopCart').fadeOut(function () {
                        $(this).replaceWith(function () {
                            return $(response).hide().fadeIn().css({display: ''});
                        });
                    });
                },
                error: function () {
                    toastr.error('Что-то пошло не так');
                }/*,
                 timeout: 7000*/
            });
        },

        /**
         * Попытка авторизироваться и оформить заказ
         * @param form
         * @param $button Кнопка которой вызвали сабмит
         */
        authBeforeOrder: function (form, button) {
            var defer = $.Deferred(),
                promise = defer.promise();

            $.ajax({
                url: form.action,
                type: 'POST',
                data: $(form).serialize(),
                beforeSend: function () {
                    $(document.body).find('.orderButton-js, .signUpAndOrder-js').prop('disabled', true);
                    $(button).addClass('loading');
                },
                success: function (response) {
                    toastr[response.result](response.message);
                    defer.resolve();
                },
                error: function (response) {
                    if (response.status === 404 && response.responseJSON) {
                        var controlWrapper = $(form).find('.errorCheckField-js'),
                            control = controlWrapper.find('input');

                        controlWrapper.addClass('has-error').find('.help-block').show();
                        $('.registrationWrapper-js').show().find('[name=' + control.attr('name') + ']').val(control.val());
                    } else {
                        toastr.error('Что-то пошло не так');
                    }
                    $(document.body).find('.orderButton-js, .signUpAndOrder-js').prop('disabled', false);
                    $(button).removeClass('loading');
                }
            });

            $.when(promise).then(
                function () {
                    self.order(button);
                }
            );
        },

        /**
         * Попытка оформить заказ
         * @param submitButton
         */
        order: function (submitButton) {
            var $orderForm = $('#orderForm'),
                submitButtonQuery = '';

            if (submitButton && submitButton.name && submitButton.value) {
                submitButtonQuery = '&' + encodeURI(submitButton.name) + '=' + encodeURI(submitButton.value)
            }

            $.ajax({
                type: 'POST',
                data: $orderForm.serialize() + submitButtonQuery,
                beforeSend: function () {
                    $(document.body).find('.orderButton-js').prop('disabled', true);
                    $(submitButton).addClass('loading');
                },
                complete: function () {
                    $(document.body).find('.orderButton-js').prop('disabled', false).removeClass('loading');
                    var $modal = $('#checkoutRegularCustomerModal:visible');
                    if ($modal.length > 0) {
                        $modal.modal('hide');
                    }
                },
                success: function (response) {
                    toastr[response.result](response.message);
                    if (response.redirect) {
                        window.location.href = response.redirect;
                    }
                },
                error: function () {
                    toastr.error('Что-то пошло не так во время оформления заказа');
                }
            })
        }
    }
})();