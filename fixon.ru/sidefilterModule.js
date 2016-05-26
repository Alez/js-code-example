var sidefilterModule = (function () {
    'use strict';
    var self,
        // Для отмены предыдущих асинхронных запросов
        filterPrevAjax,
        catalogPrevAjax,

        filterDefer,
        catalogDefer;

    return {
        init: function () {
            // Есть ли на этой странице фильтр?
            var sideFilter = document.getElementById('sideFilter');
            if (!sideFilter) {
                return false;
            }
            self = this;

            // Запускаем слайдер с диапазоном цен
            self.initPriceSlider();

            $(document.body).on('change', '.paramValue-js', function () {
                self.handleFilterAndCatalogChanges();
            });

            $(document.body).on('click', '.catalogSort-js', function () {
                self.setSort(this.getAttribute('data-sort-param'));
                self.handleCatalogOnly();
            });

            $(document.body).on('click', '.resetParam-js', function (e) {
                e.stopPropagation();
                self.resetFilterItemParams(this);
                self.handleFilterAndCatalogChanges();
            });
        },

        /**
         * Обработает изменения в фильтре и каталоге
         */
        handleFilterAndCatalogChanges: function () {
            filterDefer = $.Deferred();
            catalogDefer = $.Deferred();

            var paramsQuery = self.getFilterParams();

            self.applyFilter(paramsQuery);
            self.refreshFiler(paramsQuery);

            $.when(catalogDefer, filterDefer)
                .done(function (catalogResp, filterResp) {
                    self.syncFilterRefresh(catalogResp, filterResp)
                })
                .always(function () {
                    self.syncFilterRefreshFinish();
                })
        },

        /**
         * Обработает изменения только в каталоге
         */
        handleCatalogOnly: function () {
            catalogDefer = $.Deferred();

            self.applyFilter(self.getFilterParams());

            $.when(catalogDefer)
                .done(function (catalogResp) {
                    self.syncFilterRefresh(catalogResp)
                })
                .always(function () {
                    self.syncFilterRefreshFinish();
                });
        },

        /**
         * Слайдер для выбора диапазона цен
         */
        initPriceSlider: function () {
            var minInput = document.getElementById('minCost'),
                maxInput = document.getElementById('maxCost'),
                $minVisual = $('.minPriceValue-js'),
                $maxVisual = $('.maxPriceValue-js'),
                min = +minInput.getAttribute('data-value'),
                max = +maxInput.getAttribute('data-value'),
                priceSlider = $('#priceSlider');

            priceSlider.slider({
                range: true,
                min: min,
                max: max,
                values: [minInput.value ? minInput.value : min, maxInput.value ? maxInput.value : max],
                slide: function (event, ui) {
                    $minVisual.text((+ui.values[0]).toLocaleString('ru-RU'));
                    $maxVisual.text((+ui.values[1]).toLocaleString('ru-RU'));
                },
                change: function (event, ui) {
                    var paramsQuery = self.getFilterParams();

                    if (+minInput.value !== +ui.values[0]) {
                        minInput.value = ui.values[0];
                        self.handleFilterAndCatalogChanges();
                    }
                    if (+maxInput.value !== +ui.values[1]) {
                        maxInput.value = ui.values[1];
                        self.handleFilterAndCatalogChanges();
                    }
                }
            });
        },

        /**
         * Получит порог минимальной цены
         * @returns {Node.value|*}
         */
        getMinCost: function () {
            var minCost = document.getElementById('minCost');

            return minCost.value ? minCost.value : null;
        },

        /**
         * Получит порог минимальной цены
         * @returns {Node.value|*}
         */
        getMaxCost: function () {
            var maxCost = document.getElementById('maxCost');

            return maxCost.value ? maxCost.value : null;
        },

        /**
         * Соберёт все параметры из фильтра
         * @returns {{}}
         */
        getFilterParams: function () {
            var filterRoot = document.getElementById('sideFilter'),
                paramsQuery = {},
                params = filterRoot.querySelectorAll('.filterParam-js'),
                minCost = self.getMinCost(),
                maxCost = self.getMaxCost();

            for (var i = 0, lengthI = params.length; i < lengthI; i++) {
                var inputs = params[i].querySelectorAll('input:checked'),
                    lengthJ = inputs.length;

                if (lengthJ > 0) {
                    var slug = params[i].getAttribute('data-param-slug'),
                        paramValues = [];

                    for (var j = 0; j < lengthJ; j++) {
                        if (inputs[j].checked) {
                            paramValues.push(inputs[j].getAttribute('data-param-value'));
                        }
                    }
                    paramsQuery[slug] = paramValues.join('&');
                }
            }

            if (minCost && maxCost) {
                paramsQuery.price = minCost + '&' + maxCost;
            }

            return paramsQuery;
        },

        /**
         * Сконвертирует параметры из JSON-формата в строковый формат
         * @returns {string}
         */
        stringifyFilterParams: function (paramsQuery) {
            return Object.keys(paramsQuery).map(function (k) {
                return k + '=' + paramsQuery[k]
            }).join(':')
        },

        /**
         * Проверка всех выбранных параметров и редирект по соответствующему адресу
         * @param {{}} paramsQuery
         */
        applyFilter: function (paramsQuery) {
            var filterRoot = document.getElementById('sideFilter'),
                filterPageUrl = filterRoot.getAttribute('data-url'),
                catalogRoot = document.querySelector('.ajaxWrapper-js'),
                sortParam = filterRoot.querySelector('.sortFilter-js'),
                pageParam = filterRoot.querySelector('.pageFilter-js');

            if (JSON.stringify(paramsQuery) === '{}') {
                return;
            }

            var url = filterPageUrl + this.stringifyFilterParams(paramsQuery) + '/' + pageParam.value
                + '/' + sortParam.value;

            if (window.history && window.history.pushState) {
                history.pushState(null, document.title, url);
            }

            if (filterPrevAjax) {
                filterPrevAjax.abort();
            }

            filterPrevAjax = $.ajax({
                url: url,
                beforeSend: function () {
                    $(catalogRoot).addClass('catalogReloading');
                },
                complete: function () {
                    filterPrevAjax = null;
                },
                success: function (response) {
                    catalogDefer.resolve(response);
                },
                error: function (jqXHR, textStatus) {
                    if (textStatus === 'abort') {
                        return;
                    }
                    toastr.error('Что-то пошло не так');
                    if (catalogDefer !== undefined) {
                        catalogDefer.reject(jqXHR);
                    }
                }
            });
        },

        /**
         * Обновим пункты фильтра в соответствии с подходящими нему товарами
         * @param {{}} paramsQuery
         */
        refreshFiler: function (paramsQuery) {
            var filterRoot = document.getElementById('sideFilter'),
                url = filterRoot.getAttribute('data-refresh-url');

            if (JSON.stringify(paramsQuery) === '{}') {
                return;
            }

            if (catalogPrevAjax) {
                catalogPrevAjax.abort();
            }

            catalogPrevAjax = $.ajax({
                url: url + '?params=' + encodeURIComponent(this.stringifyFilterParams(paramsQuery)),
                complete: function () {
                    catalogPrevAjax = null;
                },
                success: function (response) {
                    filterDefer.resolve(response);
                },
                error: function (jqXHR, textStatus) {
                    if (textStatus === 'abort') {
                        return;
                    }
                    toastr.error('Что-то пошло не так');
                    filterDefer.reject(jqXHR);
                }
            });
        },

        /**
         * Выставит ипуту сортировки в фильтре новое значение
         * @param sortParam
         */
        setSort: function (sortParam) {
            document.getElementById('sideFilter').querySelector('.sortFilter-js').value = sortParam;
        },

        /**
         * Обновит каталог и фильтр только после получения ответов на оба запроса
         * @param catalogResp
         * @param filterResp
         */
        syncFilterRefresh: function (catalogResp, filterResp) {
            var catalogRoot = document.querySelector('.ajaxWrapper-js'),
                temp = document.createElement('div');

            temp.innerHTML = catalogResp;
            catalogRoot.innerHTML = temp.querySelector('.ajaxWrapper-js').innerHTML;
            // Прогрузка фото только после того как они попадают во вьюпорт
            $(catalogRoot).find('img.lazyload-js').lazyload(appConfig.lazyload);

            if (filterResp) {
                var filterRoot = document.getElementById('sideFilter');

                temp.innerHTML = filterResp;
                filterRoot.innerHTML = temp.querySelector('#sideFilter').innerHTML;
                self.initPriceSlider();
                // Красивые скролбары
                $(filterRoot).find('.scrollbar-js').scrollbar();
            }
        },

        /**
         * По завершению загрузки каталога и фильтра
         */
        syncFilterRefreshFinish: function () {
            $('.ajaxWrapper-js').removeClass('catalogReloading');
        },

        /**
         * Сбросит выбранные параметры в пункте меню фильтра
         * @param paramItemNode
         */
        resetFilterItemParams: function (paramItemNode) {
            $(paramItemNode).closest('.filterParam-js').find('input').prop('checked', false);
        }
    }
})();