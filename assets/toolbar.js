class Toolbar extends HTMLElement {
    constructor() {
        super();

        this.stickyBounds = document.getElementById('CollectionProductGrid').querySelector('.productListing');
        this.queryParams();

        if(this.querySelector('[data-view-as]')){
            this.mediaView = this.querySelector('[data-view-as]');
            this.mediaViewMobile = this.querySelector('[data-view-as-mobile]');

            this.mediaView.querySelectorAll('.icon-mode').forEach((modeButton) => {
                modeButton.addEventListener('click', this.onClickModeButtonHandler.bind(this));
            });

            this.mediaViewMobile.querySelectorAll('.icon-mode').forEach((modeMobileButton) => {
                modeMobileButton.addEventListener('click', this.onClickModeButtonMobileHandler.bind(this));
            });

            this.debouncedOnResizeMediaQuery = debounce(() => {
                this.setActiveViewModeMediaQuery(false);
            }, 200);

            var w = window.innerWidth;

            window.addEventListener('resize', () => {
                if (window.innerWidth == w) {
                    return 
                }

                w = window.innerWidth;

                this.debouncedOnResizeMediaQuery();
            });

            window.addEventListener('load', () => {
                this.debouncedOnResizeMediaQuery();
            });
        }

        if(this.querySelector('[data-limited-view]')){
            this.limitView = this.querySelector('[data-limited-view]');

            this.limitView.querySelectorAll('[data-limited-view-item]').forEach((limitButton) => {
                limitButton.addEventListener('click', this.onClickLimitButtonHandler.bind(this));
            });
        }

        if(this.querySelector('[data-toggle]')){
            this.querySelectorAll('[data-toggle]').forEach((dropdownButton) => {
                dropdownButton.addEventListener('click', this.onClickDropdownButtonHandler.bind(this));
            });

            document.body.addEventListener('click', this.onBodyClickEvent.bind(this));
        }

        if(this.querySelector('[data-sorting]')){
            this.sortBy = this.querySelector('[data-sorting]');

            if(this.sortBy.querySelector('[data-sort-by-item]')){
                this.sortBy.querySelectorAll('[data-sort-by-item]').forEach((sortByButton) => {
                    sortByButton.addEventListener('click', this.onClickSortByButtonHandler.bind(this));
                });
            }
        }

        if(this.checkNeedToConvertCurrency()){
            let currencyCode = document.getElementById('currencies')?.querySelector('.active')?.getAttribute('data-currency');

            Currency.convertAll(window.shop_currency, currencyCode, 'span.money', 'money_format');
        }
    }

    queryParams() {
        Shopify.queryParams = {};

        if (location.search.length > 0) {
            for (var aKeyValue, i = 0, aCouples = location.search.substr(1).split('&'); i < aCouples.length; i++) {
                aKeyValue = aCouples[i].split('=');

                if (aKeyValue.length > 1) {
                    Shopify.queryParams[decodeURIComponent(aKeyValue[0])] = decodeURIComponent(aKeyValue[1]);
                }
            }
        }
    }

    createURLHash(baseLink) {
        var newQuery = $.param(Shopify.queryParams).replace(/%2B/g, '+');

        if (baseLink) {
            if (newQuery != "") {
                return baseLink + "?" + newQuery;
            } else {
                return baseLink;
            }
        } else {
            if (newQuery != "") {
                return location.pathname + "?" + newQuery;
            } else {
                return location.pathname;
            }
        }
    }

    updateURLHash(baseLink) {
        delete Shopify.queryParams.page;

        var newUrl = this.createURLHash(baseLink);

        history.pushState({
            param: Shopify.queryParams
        }, newUrl, newUrl);
    }

    checkNeedToConvertCurrency() {
        return (window.show_multiple_currencies && Currency.currentCurrency != window.shop_currency) || window.show_auto_currency;
    }

    onClickDropdownButtonHandler(event) {
        var buttonElement = event.currentTarget;

        if (buttonElement.getAttribute('aria-expanded') === 'false'){
            buttonElement.setAttribute('aria-expanded', true);
        } else {
            buttonElement.setAttribute('aria-expanded', false);
        }
    }

    onClickSortByButtonHandler(event) {
        event.preventDefault();

        var buttonElement = event.currentTarget;

        if (!buttonElement.classList.contains('is-active')) {
            var value = buttonElement.querySelector('.text').getAttribute('data-value'),
                href = buttonElement.querySelector('.text').getAttribute('data-href'),
                text = buttonElement.querySelector('.text').innerText;

            this.sortBy.querySelector('.label-text').innerText = text;
            this.sortBy.querySelector('[data-toggle]').setAttribute('aria-expanded', false);

            this.sortBy.querySelectorAll('[data-sort-by-item]').forEach((sortByButton) => {
                sortByButton.classList.remove('is-active');
            });

            buttonElement.classList.add('is-active');

            if(window.show_storefront_filter) {
                const form = document.querySelector('collection-filters-form');
                    form.querySelector('[name="sort_by"]').value = href;
                    form.onSubmitHandlerFromSortBy(event, form.querySelector('form'));
            } else {
                Shopify.queryParams.sort_by = href;
                this.updateURLHash();

                var newUrl = this.createURLHash();
                this.renderPage(newUrl);
            }
        }
    }

    getSections() {
        return [
            {
                id: 'main-collection-product-grid',
                section: document.getElementById('main-collection-product-grid').dataset.id,
            }
        ]
    }

    renderPage(href) {
        const sections = this.getSections();

        // document.getElementById('CollectionProductGrid').querySelector('.collection').classList.add('is-loading');
        document.body.classList.add('has-halo-loader');

        sections.forEach((section) => {
            this.renderSectionFromFetch(href, section);
        });
    }

    renderSectionFromFetch(url, section) {
        fetch(url)
        .then(response => response.text())
        .then((responseText) => {
            const html = responseText;

            this.renderSidebar(html);
            this.renderProductGrid(html);
        });
    }

    renderSidebar(html) {
        if(document.getElementById('main-collection-filters')){
            const innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('main-collection-filters').innerHTML;

            document.getElementById('main-collection-filters').innerHTML = innerHTML;
        }
    }

    renderProductGrid(html) {
        const innerHTML = new DOMParser()
                            .parseFromString(html, 'text/html')
                            .getElementById('CollectionProductGrid')
                            .querySelector('.collection').innerHTML;

        document.getElementById('CollectionProductGrid').querySelector('.collection').innerHTML = innerHTML;

        this.setActiveViewModeMediaQuery(true);

        if(window.compare.show){
            Shopify.ProductCompare.setLocalStorageProductForCompare();
        }

        if(window.wishlist.show){
            Shopify.ProductWishlist.setLocalStorageProductForWishlist();
        }

        if(window.product_swatch_style == 'slider'){
            var productList =document.getElementById('CollectionProductGrid').querySelectorAll('.product');

            productList.forEach((element) => {
                var product = $(element),
                    productSwatch = product.find('.card-swatch--slider');
                
                if(productSwatch.length > 0){
                    var swatchGrid = productSwatch.find('.swatch');

                    if(swatchGrid.length > 0){
                        if(!swatchGrid.hasClass('slick-initialized')){
                            Shopify.ProductSwatchs.showSwatchSlider({
                                slider: swatchGrid,
                                onComplete: null
                            });
                        }
                    }
                }
            });
        }

        if(window.innerWidth < 1025){
            // document.getElementById('CollectionProductGrid').scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
            window.scrollTo({
                top: document.getElementById('CollectionProductGrid').getBoundingClientRect().top + window.pageYOffset - 50,
                behavior: 'smooth'
            });
        }

        document.body.classList.remove('has-halo-loader');
    }

    setActiveViewModeMediaQuery(ajaxLoading = true){
        var viewMode = this.mediaView?.querySelector('.icon-mode.active'),
            viewModeMobile = this.mediaViewMobile?.querySelector('.icon-mode.active'),
            column = parseInt(viewMode?.dataset.col),
            windowWidth = window.innerWidth;

        if(column != 1){
            if(document.querySelector('.sidebar--layout_vertical')){
                if (windowWidth < 768) {
                    if (column == 3 || column == 4 || column == 5) {
                        column = 2;
                        viewMode.classList.remove('active');
                        viewModeMobile.classList.remove('active');
                        this.mediaView.querySelector('.grid-2').classList.add('active');
                        this.mediaViewMobile.querySelector('.grid-2').classList.add('active');
                    }
                } else if (windowWidth <= 1100 && windowWidth >= 768) {
                    if (column == 5 || column == 4 || column == 3) {
                        column = 2;
                        viewMode.classList.remove('active');
                        viewModeMobile.classList.remove('active');
                        this.mediaView.querySelector('.grid-2').classList.add('active');
                        this.mediaViewMobile.querySelector('.grid-2').classList.add('active');
                    }
                } else if (windowWidth < 1599 && windowWidth > 1100) {
                    if (column == 5 || column == 4) {
                        column = 3;
                        viewMode.classList.remove('active');
                        viewModeMobile.classList.remove('active');
                        this.mediaView.querySelector('.grid-3').classList.add('active');
                        this.mediaViewMobile.querySelector('.grid-3').classList.add('active');
                    }
                } else if (windowWidth < 1700 && windowWidth >= 1599) {
                    if (column == 5) {
                        column = 4;
                        viewMode.classList.remove('active');
                        viewModeMobile.classList.remove('active');
                        this.mediaView.querySelector('.grid-4').classList.add('active');
                        this.mediaViewMobile.querySelector('.grid-4').classList.add('active');
                    }
                }
            } else{
                if (windowWidth < 768) {
                    if (column == 3 || column == 4 || column == 5) {
                        column = 2;
                        viewMode.classList.remove('active');
                        viewModeMobile.classList.remove('active');
                        this.mediaView.querySelector('.grid-2').classList.add('active');
                        this.mediaViewMobile.querySelector('.grid-2').classList.add('active');
                    }
                } else if (windowWidth < 992 && windowWidth >= 768) {
                    if (column == 4 || column == 5) {
                        column = 3;
                        viewMode.classList.remove('active');
                        viewModeMobile.classList.remove('active');
                        this.mediaView.querySelector('.grid-3').classList.add('active');
                        this.mediaViewMobile.querySelector('.grid-3').classList.add('active');
                    }
                } else if (windowWidth < 1600 && windowWidth >= 992) {
                    if (column == 5) {
                        column = 4;
                        viewMode.classList.remove('active');
                        viewModeMobile.classList.remove('active');
                        this.mediaView.querySelector('.grid-4').classList.add('active');
                        this.mediaViewMobile.querySelector('.grid-4').classList.add('active');
                    }
                }
            }
            
            this.initViewModeLayout(column);
        } else{
            if(ajaxLoading){
                this.initViewModeLayout(column);
            }
        }
    }

    initViewModeLayout(column) {
        const productListing = document.getElementById('CollectionProductGrid').querySelector('.productListing');

        if (!productListing) return;

        switch (column) {
            case 1:
                productListing.classList.remove('productGrid', 'column-5', 'column-4', 'column-3', 'column-2');
                productListing.classList.add('productList');

                break;

            default:
                switch (column) {
                    case 2:
                        productListing.classList.remove('productList', 'column-5', 'column-4', 'column-3');
                        productListing.classList.add('productGrid', 'column-2');

                        break;
                    case 3:
                        productListing.classList.remove('productList', 'column-5', 'column-4', 'column-2');
                        productListing.classList.add('productGrid', 'column-3');

                        break;
                    case 4:
                        productListing.classList.remove('productList', 'column-5', 'column-3', 'column-2');
                        productListing.classList.add('productGrid', 'column-4');

                        break;
                    case 5:
                        productListing.classList.remove('productList', 'column-4', 'column-3', 'column-2');
                        productListing.classList.add('productGrid', 'column-5');

                        break;
                }
        };
    }

    onClickModeButtonHandler(event){
        event.preventDefault();

        var buttonElement = event.currentTarget,
            viewMode = this.mediaView.querySelector('.icon-mode.active'),
            column = parseInt(buttonElement.dataset.col);

        if(!buttonElement.classList.contains('active')){
            viewMode.classList.remove('active');
            buttonElement.classList.add('active');

            this.mediaViewMobile.querySelectorAll('.icon-mode').forEach((element) => {
                var currentColum = parseInt(element.dataset.col);

                if(currentColum == column){
                    element.classList.add('active');
                } else {
                    element.classList.remove('active');
                }
            });

            this.initViewModeLayout(column);
        }
    }

    onClickModeButtonMobileHandler(event){
        event.preventDefault();

        var buttonElement = event.currentTarget,
            viewMode = this.mediaViewMobile.querySelector('.icon-mode.active'),
            column = parseInt(buttonElement.dataset.col);

        if(!buttonElement.classList.contains('active')){
            viewMode.classList.remove('active');
            buttonElement.classList.add('active');

            this.mediaView.querySelectorAll('.icon-mode').forEach((element) => {
                var currentColum = parseInt(element.dataset.col);

                if(currentColum == column){
                    element.classList.add('active');
                } else {
                    element.classList.remove('active');
                }
            });

            this.initViewModeLayout(column);
        }
    }

    onClickLimitButtonHandler(event){
        event.preventDefault();

        var buttonElement = event.currentTarget;

        if(!buttonElement.classList.contains('is-active')){
            var value = parseInt(buttonElement.querySelector('.text').dataset.value);

            this.limitView.querySelector('.label-text').innerText = value;
            this.limitView.querySelector('[data-toggle]').setAttribute('aria-expanded', false);

            this.limitView.querySelectorAll('[data-limited-view-item]').forEach((limitButton) => {
                limitButton.classList.remove('is-active');
            });

            buttonElement.classList.add('is-active');

            $.ajax({
                type: 'POST',
                url: '/cart.js',
                dataType: 'json',
                data: {
                    "attributes[pagination]": value
                },
                success: (data) => {
                    window.location.reload();
                },
                error: (xhr, text) => {
                    alert($.parseJSON(xhr.responseText).description);
                }
            });
        }
    }

    connectedCallback(){
        this.onScrollHandler = this.onScroll.bind(this);
        window.addEventListener('scroll', this.onScrollHandler, false);
    }

    disconnectedCallback() {
        window.removeEventListener('scroll', this.onScrollHandler);
    }

    onScroll() {
        const offsetScroll = this.stickyBounds?.getBoundingClientRect().y;

        var windowWidth = window.innerWidth;

        if (windowWidth < 1025) {
            if (offsetScroll < 0) {
                requestAnimationFrame(this.showSticky.bind(this));

                if(document.body.classList.contains('scroll-up') || document.body.classList.contains('stickyNavigation')){
                    var height = document.querySelector('.header-group').offsetHeight;

                    this.style.top = `${height}px`;
                } else if(document.body.classList.contains('scroll-down')) {
                    this.style.top = 0;
                } else if (!document.body.classList.contains('scroll-down')){
                    this.style.top = 0;
                }
            } else{
                requestAnimationFrame(this.hideSticky.bind(this));
            }
        }
    }

    hideSticky() {
        this.classList.remove('show-sticky', 'animate');
        this.closeDropdownPopupSticky();
    }

    showSticky() {
        this.classList.add('show-sticky', 'animate');
        this.closeDropdownPopupSticky();
    }

    closeDropdownPopupSticky(){
        if(this.querySelector('.label-tab')){
            this.querySelectorAll('.label-tab').forEach((element) => {
                element.setAttribute('aria-expanded', false);
            });
        }
    }

    onBodyClickEvent(event){
        if(this.querySelector('[data-toggle]')){
            this.querySelectorAll('[data-toggle]').forEach((dropdownButton) => {
                var contentDropdown = dropdownButton.nextElementSibling;

                if ((!contentDropdown.contains(event.target)) && (!dropdownButton.contains(event.target))){
                    dropdownButton.setAttribute('aria-expanded', false);
                }
            });
        }
    }
}

customElements.define('toolbar-item', Toolbar);