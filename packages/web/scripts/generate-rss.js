"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var feed_1 = require("feed");
var promises_1 = require("fs/promises");
var env_1 = require("@next/env");
var kysely_1 = require("@luzzle/kysely");
(0, env_1.loadEnvConfig)(process.cwd(), process.env.NODE_ENV !== 'production');
function generateRss(books, type) {
    return __awaiter(this, void 0, void 0, function () {
        var feed, items;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    feed = new feed_1.Feed({
                        title: process.env.TITLE || '',
                        description: process.env.DESCRIPTION,
                        id: "".concat(process.env.NEXT_PUBLIC_HOST, "/").concat(type),
                        link: process.env.NEXT_PUBLIC_HOST,
                        ttl: 60 * 24,
                        // image,
                        // favicon,
                        updated: new Date(),
                        generator: 'jpmonette/feed',
                        language: 'en',
                        copyright: "\u00A9 ".concat(new Date().getFullYear()),
                        feedLinks: {
                            rss2: "".concat(process.env.NEXT_PUBLIC_HOST, "/rss/").concat(type, "/feed.xml"),
                            json: "".concat(process.env.NEXT_PUBLIC_HOST, "/rss/").concat(type, "/feed.json")
                        }
                    });
                    items = books === null || books === void 0 ? void 0 : books.map(function (book) {
                        var _a;
                        return {
                            title: book.title,
                            author: [{ name: book.author }],
                            link: "".concat(process.env.NEXT_PUBLIC_HOST, "/books/").concat(book.slug),
                            image: book.cover
                                ? "".concat(process.env.NEXT_PUBLIC_HOST_STATIC, "/images/og/books/").concat(book.slug, ".png")
                                : undefined,
                            description: book.description || '',
                            content: book.description || '',
                            date: new Date((_a = book.date_read) !== null && _a !== void 0 ? _a : book.date_added)
                        };
                    });
                    items.forEach(function (item) {
                        feed.addItem(item);
                    });
                    return [4 /*yield*/, (0, promises_1.mkdir)("./public/rss/".concat(type), { recursive: true })
                        // https://github.com/jpmonette/feed/issues/140
                    ];
                case 1:
                    _a.sent();
                    // https://github.com/jpmonette/feed/issues/140
                    return [4 /*yield*/, (0, promises_1.writeFile)("./public/rss/".concat(type, "/feed.xml"), feed
                            .rss2()
                            .replace('<?xml version="1.0" encoding="utf-8"?>', "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<?xml-stylesheet type=\"text/xsl\" href=\"../feed.xslt\"?>"))];
                case 2:
                    // https://github.com/jpmonette/feed/issues/140
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var db, books;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = (0, kysely_1.getDatabaseClient)("".concat(process.env.LUZZLE_FOLDER, "/luzzle.sqlite"));
                    return [4 /*yield*/, db
                            .selectFrom('books')
                            .limit(50)
                            .orderBy('date_added', 'desc')
                            .selectAll()
                            .execute()];
                case 1:
                    books = _a.sent();
                    generateRss(books, 'books');
                    return [2 /*return*/];
            }
        });
    });
}
main()["catch"](function (err) {
    console.error(err);
    process.exit(1);
})["finally"](function () {
    console.log('complete: rss generation');
});
