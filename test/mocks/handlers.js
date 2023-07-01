const {rest} = require("msw");

import {productsMock} from "./productsMock";

export const handlers = [
    rest.get('/hw/store/api/products/:id(\\d+)', (req, res, ctx) => {
        const bugId = Number(process.env.BUG_ID) || 0;

        let id = Number(req.params.id);

        if (bugId === 3) {
            id = 0;
        }

        return res(ctx.json(productsMock.find((product) => product.id === id)));
    }),
    rest.get('/hw/store/api/products', (req, res, ctx) => {
        const bugId = Number(process.env.BUG_ID) || 0;

        const products = bugId === 1
            ? productsMock.map((product) => {
                product.name = undefined;
                return product;
            })
            : productsMock;

        return res(ctx.json(products));
    }),
];
