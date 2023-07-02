// noinspection DuplicatedCode

const { expect, assert } = require("chai");

describe("Интеграционные тесты", function () {
  beforeEach(async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    await page.goto("http://localhost:3000/hw/store/");
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  it("T1. В шапке рядом со ссылкой на корзину должно отображаться количество не повторяющихся товаров в ней", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const TEST_PRODUCTS_COUNT = 5;

    await page.goto("http://localhost:3000/hw/store/");

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );
    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    await page.waitForSelector(".Catalog:has(.ProductItem-DetailsLink)", {
      timeout: 10000,
    });

    const items = await page.$$(".ProductItem-DetailsLink");

    items.length = Math.min(TEST_PRODUCTS_COUNT, items.length);

    for (let i = 0; i < items.length; i++) {
      const item = await page.evaluateHandle((i) => {
        return document.querySelectorAll(".ProductItem-DetailsLink")[i];
      }, i);

      await item.click();
      await page.waitForSelector(".ProductDetails", { timeout: 10000 });

      const addCartButton = await page.$(".ProductDetails-AddToCart");
      await addCartButton.click();
      await addCartButton.click();

      await page.goBack({ waitUntil: "load" });
      await page.waitForSelector(".Catalog:has(.ProductItem)");
    }

    const cartLink = await page.$(".Application-Menu a[href='/hw/store/cart']");
    await Promise.all([page.waitForNavigation(), cartLink.click()]);

    const distinctCount = await page.$$eval(
      ".Cart-Table .Cart-Name",
      (items) => items.length
    );
    const cartLabel = await page.$eval(
      ".Application-Menu a[href='/hw/store/cart']",
      (link) => link.innerText
    );

    expect(cartLabel).eq(`Cart` + (distinctCount ? ` (${distinctCount})` : ""));
  });

  it("T2. Если корзина пустая, должна отображаться ссылка на каталог товаров", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto("http://localhost:3000/hw/store/");

    const cartLink = await page.$(".Application-Menu a[href='/hw/store/cart']");
    await Promise.all([page.waitForNavigation(), cartLink.click()]);

    assert.ok(
      await page.$(".Cart a[href='/hw/store/catalog']"),
      "Ссылка на каталог не отобразилась"
    );
  });

  it("T3. Если товар уже добавлен в корзину, в каталоге и на странице товара есть сообщение об этом", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const DATA_TEST_ID = "0";

    await page.goto("http://localhost:3000/hw/store/");

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );
    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    await page.waitForSelector(
      `.ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`,
      { timeout: 10000 }
    );

    const cardLink = await page.$(
      `.ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`
    );

    await Promise.all([page.waitForNavigation(), cardLink.click()]);

    const addToCardButton = await page.waitForSelector(
      ".ProductDetails-AddToCart",
      { timeout: 10000 }
    );

    await addToCardButton.click();

    const [badgeAtDetails, name] = await page.evaluate(() => {
      return [
        document.querySelector(".CartBadge")?.innerHTML || null,
        document.querySelector(".ProductDetails-Name")?.innerHTML || null,
      ];
    });

    const cartLink = await page.$(".Application-Menu a[href='/hw/store/cart']");
    await Promise.all([page.waitForNavigation(), cartLink.click()]);

    await page.waitForSelector(".Cart", { timeout: 10000 });
    const itemsAtCart = await page.$$eval(".Cart-Table .Cart-Name", (names) =>
      names.map((name) => name.innerHTML)
    );

    if (itemsAtCart.includes(name)) {
      await Promise.all([page.waitForNavigation(), catalogLink.click()]);

      const badgeAtCatalog = page.$(
        `.ProductItem[data-testid='${DATA_TEST_ID}'] .CartBadge`
      );

      assert(badgeAtDetails !== null && badgeAtCatalog !== null, "CartBadge");
    }
  });

  it("T4. Содержимое корзины должно сохраняться между перезагрузками страницы", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const DATA_TEST_ID = "0";

    await page.goto("http://localhost:3000/hw/store/");

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );
    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    await page.waitForSelector(
      `.ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`,
      { timeout: 10000 }
    );

    const cardLink = await page.$(
      `.ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`
    );

    await Promise.all([page.waitForNavigation(), cardLink.click()]);

    const addToCardButton = await page.waitForSelector(
      ".ProductDetails-AddToCart",
      { timeout: 10000 }
    );

    await addToCardButton.click();

    const cartLink = await page.$(".Application-Menu a[href='/hw/store/cart']");
    await Promise.all([page.waitForNavigation(), cartLink.click()]);

    await page.waitForSelector(".Cart", { timeout: 10000 });

    if (await page.$(".Cart-Table")) {
      const innerHTMLBefore = await page.$eval(
        ".Cart-Table",
        (el) => el.innerHTML
      );

      await Promise.all([
        page.waitForNavigation(),
        page.reload({ waitUntil: "networkidle0" }),
      ]);

      const innerHTMLAfter = await page.$eval(
        ".Cart-Table",
        (el) => el.innerHTML
      );

      expect(innerHTMLBefore).eq(innerHTMLAfter);
    }
  });

  it("T5. В каталоге должны отображаться товары, список которых приходит с сервера", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto("http://localhost:3000/hw/store/");

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );
    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    const catalog = await page.waitForSelector(".Catalog:has(.ProductItem)", {
      timeout: 10000,
    });

    await catalog.evaluate((el) => {
      el.querySelectorAll(".ProductItem-Name").forEach(
        (nameEl) => (nameEl.innerHTML = "Title")
      );
      el.querySelectorAll(".ProductItem-Price").forEach(
        (priceEl) => (priceEl.innerHTML = "$999")
      );
    });

    await this.browser.assertView("catalog/desktop", ".Catalog", {
      screenshotDelay: 2000,
      ignoreElements: [".CartBadge"],
    });
  });

  it("T6. В каталоге отображается название, цена и ссылка на страницу с информацией о товаре", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const hrefRegExp = /\/hw\/store\/catalog\/\d+\/?/;

    await page.goto("http://localhost:3000/hw/store/");

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );

    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    await page.waitForSelector(".Catalog:has(.ProductItem)", {
      timeout: 10000,
    });

    const products = await page.$$(".ProductItem");

    for (let product of products) {
      const [title, price, href] = await Promise.all([
        product.$eval(".ProductItem-Name", (el) => el.innerHTML),
        product.$eval(".ProductItem-Price", (el) => el.innerHTML),
        product.$eval(".ProductItem-DetailsLink", (el) =>
          el.getAttribute("href")
        ),
      ]);

      expect(title).to.have.length.above(0);
      expect(price).to.have.length.above(0);
      expect(href).to.match(hrefRegExp);
    }
  });

  it('T7. На странице с подробной информацией есть: название товара, описание, цена, цвет, материал и кнопка "добавить в корзину"', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const DATA_TEST_ID = "0";

    await page.goto("http://localhost:3000/hw/store/");

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );
    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    await page.waitForSelector(".Catalog", { timeout: 10000 });

    const cardLink = await page.$(
      `.Catalog .ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`
    );

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      cardLink.click(),
    ]);

    await page.waitForSelector(".ProductDetails", { timeout: 10000 });

    const [image, name, description, price, color, material] =
      await Promise.all([
        page.$eval(".Product .Image", (el) => el.src),
        page.$eval(".ProductDetails-Name", (el) => el.innerHTML),
        page.$eval(".ProductDetails-Description", (el) => el.innerHTML),
        page.$eval(".ProductDetails-Price", (el) => el.innerHTML),
        page.$eval(".ProductDetails-Color", (el) => el.innerHTML),
        page.$eval(".ProductDetails-Material", (el) => el.innerHTML),
        page.waitForSelector(".ProductDetails-AddToCart", { timeout: 10000 }),
      ]);

    expect(image).has.length.above(0);
    expect(name).has.length.above(0);
    expect(description).has.length.above(0);
    expect(price).has.length.above(0);
    expect(color).has.length.above(0);
    expect(material).has.length.above(0);
  });

  it("T8. Главная страница должна адаптироваться под ширину экрана", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto("http://localhost:3000/hw/store/");

    await this.browser.assertView("main-page/desktop", ".Home", {
      ignoreElements: ['.Application-Menu .nav-link[href="/hw/store/cart"]'],
      screenshotDelay: 2000,
    });

    await page.setViewport({
      width: 500,
      height: page.viewport().height,
      deviceScaleFactor: 1,
    });

    await this.browser.assertView("main-page/mobile", ".Home", {
      screenshotDelay: 2000,
    });
  });

  it('T9. Страница "Доставка" должна адаптироваться под ширину экрана', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto(`http://localhost:3000/hw/store/delivery/`);

    await this.browser.assertView("delivery-page/desktop", ".Delivery", {
      ignoreElements: ['.Application-Menu .nav-link[href="/hw/store/cart"]'],
      screenshotDelay: 2000,
    });

    await page.setViewport({
      width: 500,
      height: page.viewport().height,
      deviceScaleFactor: 1,
    });

    await this.browser.assertView("delivery-page/mobile", ".Delivery", {
      screenshotDelay: 2000,
    });
  });

  it('T10. Страница "Контакты" должна адаптироваться под ширину экрана', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto(`http://localhost:3000/hw/store/contacts/`);

    await this.browser.assertView("contacts-page/desktop", ".Contacts", {
      ignoreElements: ['.Application-Menu .nav-link[href="/hw/store/cart"]'],
      screenshotDelay: 2000,
    });

    await page.setViewport({
      width: 500,
      height: page.viewport().height,
      deviceScaleFactor: 1,
    });

    await this.browser.assertView("contacts-page/mobile", ".Contacts", {
      screenshotDelay: 2000,
    });
  });

  it('T11. Страница "Каталог" должна адаптироваться под ширину экрана', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto(`http://localhost:3000/hw/store/catalog/`);

    const catalog = await page.waitForSelector(".Catalog:has(.ProductItem)", {
      timeout: 10000,
    });

    await catalog.evaluate((el) => {
      el.querySelectorAll(".ProductItem-Name").forEach(
        (nameEl) => (nameEl.innerHTML = "Title")
      );
      el.querySelectorAll(".ProductItem-Price").forEach(
        (priceEl) => (priceEl.innerHTML = "$999")
      );
    });

    await this.browser.assertView("catalog-page/desktop", ".Catalog", {
      screenshotDelay: 2000,
    });

    await page.setViewport({
      width: 500,
      height: page.viewport().height,
      deviceScaleFactor: 1,
    });

    await this.browser.assertView("catalog-page/mobile", ".Catalog", {
      screenshotDelay: 2000,
    });
  });

  it('T12. Страница "Корзина" должна адаптироваться под ширину экрана', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const DATA_TEST_ID = "0";

    await page.goto(`http://localhost:3000/hw/store/`);

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );
    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    await page.waitForSelector(".Catalog", { timeout: 10000 });

    const cardLink = await page.$(
      `.Catalog .ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`
    );

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      cardLink.click(),
    ]);

    await page.waitForSelector(".ProductDetails", { timeout: 10000 });

    const addToCartButton = await page.$(".ProductDetails-AddToCart");

    await addToCartButton.click();

    const cartLink = await page.$(".Application-Menu a[href='/hw/store/cart']");
    await Promise.all([page.waitForNavigation(), cartLink.click()]);

    await page.waitForSelector(".Cart", { timeout: 10000 });

    const items = await page.$$("Cart-Name");

    if (items.length) {
      await this.browser.assertView("cart/desktop", ".Cart", {
        screenshotDelay: 2000,
      });

      await page.setViewport({
        width: 500,
        height: page.viewport().height,
        deviceScaleFactor: 1,
      });

      await this.browser.assertView("cart/mobile", ".Cart", {
        screenshotDelay: 2000,
      });
    }
  });

  it("T13. Страница товара должна адаптироваться", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const DATA_TEST_ID = "0";

    await page.goto(`http://localhost:3000/hw/store/`);

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );
    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    const cardLink = await page.waitForSelector(
      `.Catalog .ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`,
      { timeout: 10000 }
    );

    await cardLink.evaluate((el) => {
      el.href;
    });

    await Promise.all([page.waitForNavigation(), cardLink.click()]);

    const productDetails = await page.waitForSelector(".ProductDetails", {
      timeout: 10000,
    });

    await productDetails.evaluate((el) => {
      el.querySelector(".ProductDetails-Name").innerHTML = "Title";
      el.querySelector(".ProductDetails-Price").innerHTML = "$999";
      el.querySelector(".ProductDetails-Description").innerHTML =
        "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Impedit in nostrum quaerat vel! Consequuntur cupiditate debitis dicta, doloribus et in ipsum laborum neque praesentium quidem saepe sit ullam veniam vitae!";
      el.querySelector(".ProductDetails-Color").innerHTML = "Some color";
      el.querySelector(".ProductDetails-Material").innerHTML = "Some material";
    });

    await this.browser.assertView("product/desktop", ".Product", {
      screenshotDelay: 2000,
    });

    await page.setViewport({
      width: 500,
      height: page.viewport().height,
      deviceScaleFactor: 1,
    });

    await this.browser.assertView("product/mobile", ".Product", {
      screenshotDelay: 2000,
    });
  });

  it('T14. На ширине меньше 576px навигационное меню должно скрываться за "гамбургер"', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store/`),
    ]);

    await page.setViewport({
      width: 500,
      height: page.viewport().height,
      deviceScaleFactor: 1,
    });

    await page.waitForSelector(".Application-Toggler", {
      visible: true,
      timeout: 10000,
    });
  });

  it("T15. При выборе элемента из меню 'гамбургера', меню должно закрываться", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.setViewport({
      width: 500,
      height: page.viewport().height,
      deviceScaleFactor: 1,
    });

    await page.goto(`http://localhost:3000/hw/store/`);
    await page.waitForSelector(".Application-Menu");

    const toggle = await page.$(".Application-Toggler");

    const menuItem = await page.$(".Application-Menu .navbar-nav a");

    await toggle.click();

    assert.ok(
      await page.$(".Application-Menu:not(.collapse)"),
      "Меню не открывается"
    );

    await menuItem.click();

    assert.ok(
      await page.$(".Application-Menu.collapse"),
      "Меню не закрывается при выборе элемента"
    );
  });

  it("T16. В корзине должна отображаться таблица с добавленными в нее товарами", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const TEST_PRODUCTS_COUNT = 5;

    await page.goto("http://localhost:3000/hw/store/");

    const catalogLink = await page.$(
      ".Application-Menu a[href='/hw/store/catalog']"
    );
    await Promise.all([page.waitForNavigation(), catalogLink.click()]);

    await page.waitForSelector(".Catalog:has(.ProductItem)", {
      timeout: 10000,
    });

    const items = await page.$$(".ProductItem-DetailsLink");
    items.length = Math.min(items.length, TEST_PRODUCTS_COUNT);

    const expectedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = await page.evaluateHandle((i) => {
        return document.querySelectorAll(".ProductItem-DetailsLink")[i];
      }, i);

      await item.click();
      await page.waitForSelector(".ProductDetails", { timeout: 10000 });

      const [name, price] = await Promise.all([
        page.$eval(".ProductDetails-Name", (el) => el.innerHTML),
        page.$eval(".ProductDetails-Price", (el) =>
          Number(el.innerHTML.slice(1))
        ),
      ]);

      const addCartButton = await page.$(".ProductDetails-AddToCart");
      await addCartButton.click();
      const cardBadge = page.$(".CartBadge");
      if (cardBadge !== null) {
        expectedItems.push({ name, price, count: 1 });
      }
      await page.goBack({ waitUntil: "load" });
      await page.waitForSelector(".Catalog:has(.ProductItem)");
    }

    const cardLink = await page.$(".Application-Menu a[href='/hw/store/cart']");
    await Promise.all([page.waitForNavigation(), cardLink.click()]);

    const itemsInCart = await page.$$eval(
      ".Cart-Table tr[data-testid]",
      (rows) => {
        return rows.map((row) => {
          const name = row.querySelector(".Cart-Name").innerHTML;
          const price = Number(
            row.querySelector(".Cart-Price").innerHTML.slice(1)
          );
          const count = Number(row.querySelector(".Cart-Count").innerHTML);
          return { name, price, count };
        });
      }
    );

    const expectedTotal = expectedItems.reduce(
      (acc, curr) => (acc += curr.price * curr.count),
      0
    );

    assert.ok(await page.$(".Cart-OrderPrice"), "trouble");

    const cartTotal = await page.$eval(".Cart-OrderPrice", (total) =>
      Number(total.innerHTML.slice(1))
    );
    const cartCalculatedTotal = itemsInCart.reduce(
      (acc, curr) => (acc += curr.price * curr.count),
      0
    );

    expect(expectedTotal).eq(cartTotal).eq(cartCalculatedTotal);
    expect(expectedItems).to.eql(itemsInCart);
  });

  it("T17. Если товар уже добавлен в корзину, повторное добавление должно увеличивать его количество", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const DATA_TEST_ID = "0";

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store/catalog/`, {
        waitUntil: "networkidle0",
      }),
    ]);

    await page.waitForSelector(".Catalog", { timeout: 10000 });

    const cardLink = await page.waitForSelector(
      `.Catalog .ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`,
      { timeout: 10000 }
    );

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      cardLink.click(),
    ]);

    const product = await page.waitForSelector(".ProductDetails", {
      timeout: 10000,
    });

    if (!product) {
      return;
    }

    const addToCardButton = await page.waitForSelector(
      ".ProductDetails-AddToCart",
      { timeout: 10000 }
    );

    await addToCardButton.click();
    await addToCardButton.click();

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store/cart/`, {
        waitUntil: "networkidle0",
      }),
    ]);

    if (await page.$(`.Cart-Table tr[data-testid="${DATA_TEST_ID}"]`)) {
      const count = await page.$eval(
        `.Cart-Table tr[data-testid="${DATA_TEST_ID}"] .Cart-Count`,
        (el) => Number(el.innerHTML)
      );
      const price = await page.$eval(
        `.Cart-Table tr[data-testid="${DATA_TEST_ID}"] .Cart-Price`,
        (el) => Number(el.innerHTML?.slice(1))
      );
      const total = await page.$eval(".Cart-Table .Cart-OrderPrice", (el) =>
        Number(el.innerHTML?.slice(1))
      );

      expect(count).eq(2);
      expect(total).eq(count * price);
    }
  });

  it("T18. Оформление заказа", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const TEST_PRODUCTS_COUNT = 5;

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store/catalog/`, {
        waitUntil: "networkidle0",
      }),
    ]);

    await page.waitForSelector(".Catalog:has(.ProductItem)", {
      timeout: 10000,
    });

    const items = await page.$$(".ProductItem-DetailsLink");
    items.length = Math.min(items.length, TEST_PRODUCTS_COUNT);

    let addedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = await page.evaluateHandle((i) => {
        return document.querySelectorAll(".ProductItem-DetailsLink")[i];
      }, i);

      await item.click();
      await page.waitForSelector(".ProductDetails", { timeout: 10000 });

      const addCartButton = await page.$(".ProductDetails-AddToCart");

      await addCartButton.click();
      if (await page.$(".CartBadge")) {
        addedCount += 1;
      }

      await page.goBack({ waitUntil: "load" });
      await page.waitForSelector(".Catalog:has(.ProductItem)");
    }

    const cardLink = await page.$(".Application-Menu a[href='/hw/store/cart']");
    await Promise.all([page.waitForNavigation(), cardLink.click()]);

    await page.waitForSelector(".Cart", { timeout: 10000 });

    if (addedCount) {
      const [inputName, inputPhone, inputAddress, submitButton] =
        await Promise.all([
          page.$(".Form-Field_type_name"),
          page.$(".Form-Field_type_phone"),
          page.$(".Form-Field_type_address"),
          page.$(".Form-Submit"),
        ]);

      await inputName.type("Ivanov Ivan");
      await inputPhone.type("+79123333333");
      await inputAddress.type("119021, г. Москва, ул. Льва Толстого, д. 16.");
      await submitButton.click();

      await page.waitForSelector(".Cart-SuccessMessage", { timeout: 10000 });
      await page.$eval(".Cart-SuccessMessage .Cart-Number", (el) => {
        el.innerHTML = "";
      });
      await this.browser.assertView(
        "succeed-checkout",
        ".Cart-SuccessMessage",
        {
          screenshotDelay: 2000,
        }
      );
    }
  });

  it('T19. В корзине должна быть кнопка "очистить корзину", по нажатию на которую все товары должны удаляться', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const DATA_TEST_ID = "0";
    await page.evaluate(() => localStorage.clear());

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store/catalog/`),
    ]);

    await page.waitForSelector(
      `.ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`,
      { timeout: 10000 }
    );

    const cardLink = await page.$(
      `.ProductItem[data-testid="${DATA_TEST_ID}"] .ProductItem-DetailsLink`
    );

    await Promise.all([page.waitForNavigation(), cardLink.click()]);

    const addToCardButton = await page.waitForSelector(
      ".ProductDetails-AddToCart",
      { timeout: 10000 }
    );

    await addToCardButton.click();

    const cartLink = await page.$(".Application-Menu a[href='/hw/store/cart']");
    await Promise.all([page.waitForNavigation(), cartLink.click()]);

    const clearCartButton = await page.$(".Cart-Clear");
    if (clearCartButton !== null) {
      await clearCartButton.click();

      assert.notOk(
        await page.$(".Cart-Table"),
        "Очистка корзины не отработала"
      );
    }
  });

  it("T20. Содержимое Главной страницы не изменилось", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store/`),
    ]);

    await this.browser.assertView("main-page-content", ".Home", {
      screenshotDelay: 2000,
    });
  });

  it('T21. Содержимое страницы "Контакты" не изменилось', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store/contacts/`),
    ]);

    await this.browser.assertView("contacts-page-content", ".Contacts", {
      screenshotDelay: 2000,
    });
  });

  it('T22. Содержимое страницы "Доставка" не изменилось', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store/delivery`),
    ]);

    await this.browser.assertView("delivery-page-content", ".Delivery", {
      screenshotDelay: 2000,
    });
  });

  it("T23. Название магазина в шапке должно быть ссылкой на главную страницу ", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto(`http://localhost:3000/hw/store`);

    const href = await page.$eval(".Application-Brand", (el) =>
      el.getAttribute("href")
    );

    expect(href).eq("/hw/store/");
  });

  it("T24. В шапке отображаются ссылки на страницы магазина, а также ссылка на корзину", async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();
    const expectedLinksList = [
      "/hw/store/catalog",
      "/hw/store/delivery",
      "/hw/store/contacts",
      "/hw/store/cart",
    ];

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store`),
    ]);

    const links = await page.$$eval(".Application-Menu .nav-link", (links) => {
      return links.map((link) => link.getAttribute("href"));
    });

    expect(expectedLinksList).to.have.all.members(links);
  });

  it('T25. В магазине есть страница "Главная"', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await Promise.all([
      page.waitForNavigation(),
      page.goto(`http://localhost:3000/hw/store`),
    ]);

    await page.waitForSelector(".Home", { timeout: 10000 });
    const title = await page.title();

    assert.equal(title, "Welcome — Example store");
  });

  it('T26. В магазине есть страница "Каталог"', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto(`http://localhost:3000/hw/store/catalog`);

    await page.waitForSelector(".Catalog", { timeout: 10000 });
    const title = await page.title();

    assert.equal(title, "Catalog — Example store");
  });

  it('T27. В магазине есть страница "Доставка"', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto("http://localhost:3000/hw/store/delivery");

    await page.waitForSelector(".Delivery", { timeout: 10000 });
    const title = await page.title();

    assert.equal(title, "Delivery — Example store");
  });

  it('T28. В магазине есть страница "Контакты"', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto(`http://localhost:3000/hw/store/contacts`);

    await page.waitForSelector(".Contacts", { timeout: 10000 });
    const title = await page.title();

    assert.equal(title, "Contacts — Example store");
  });

  it('T29. В магазине есть страница "Корзина"', async function () {
    const puppeteer = await this.browser.getPuppeteer();
    const [page] = await puppeteer.pages();

    await page.goto(`http://localhost:3000/hw/store/cart`);

    await page.waitForSelector(".Cart", { timeout: 10000 });

    const title = await page.title();

    assert.equal(title, "Shopping cart — Example store");
  });
});
