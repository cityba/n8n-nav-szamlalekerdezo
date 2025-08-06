"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const xml2js = __importStar(require("xml2js"));
const axios_1 = __importDefault(require("axios"));
class NavClient {
    constructor(authData) {
        this.authData = authData;
        this.API_URL = 'https://api.onlineszamla.nav.gov.hu/invoiceService/v3';
    }
    sha3_512(data) {
        return crypto.createHash('sha3-512').update(data, 'utf8').digest('hex').toUpperCase();
    }
    sha512(data) {
        return crypto.createHash('sha512').update(data, 'utf8').digest('hex').toUpperCase();
    }
    getTimestamp() {
        return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    }
    async queryInvoiceDigest(direction, dateFrom, dateTo) {
        let page = 1;
        let invoices = [];
        let availablePage = 1;
        do {
            const response = await this.queryInvoiceDigestPage(direction, dateFrom, dateTo, page);
            invoices = invoices.concat(response.invoiceDigests);
            availablePage = response.availablePage;
            page++;
        } while (page <= availablePage);
        return { invoiceDigests: invoices };
    }
    async queryInvoiceDigestPage(direction, dateFrom, dateTo, page) {
        const requestId = `RID${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
        const timestamp = this.getTimestamp();
        const cleanTimestamp = timestamp.replace(/[^0-9]/g, '');
        const signature = this.sha3_512(requestId + cleanTimestamp + this.authData.signKey);
        const xmlRequest = `
            <QueryInvoiceDigestRequest xmlns="http://schemas.nav.gov.hu/OSA/3.0/api">
                <common:header xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
                    <common:requestId>${requestId}</common:requestId>
                    <common:timestamp>${timestamp}</common:timestamp>
                    <common:requestVersion>3.0</common:requestVersion>
                    <common:headerVersion>1.0</common:headerVersion>
                </common:header>
                <common:user xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
                    <common:login>${this.authData.login}</common:login>
                    <common:passwordHash cryptoType="SHA-512">${this.sha512(this.authData.password)}</common:passwordHash>
                    <common:taxNumber>${this.authData.taxNumber}</common:taxNumber>
                    <common:requestSignature cryptoType="SHA3-512">${signature}</common:requestSignature>
                </common:user>
                <software>
                    <softwareId>123456789123456789</softwareId>
                    <softwareName>n8n</softwareName>
                    <softwareOperation>ONLINE_SERVICE</softwareOperation>
                    <softwareMainVersion>1.0</softwareMainVersion>
                    <softwareDevName>n8n fejlesztő</softwareDevName>
                    <softwareDevContact>email@example.com</softwareDevContact>
                    <softwareDevCountryCode>HU</softwareDevCountryCode>
                    <softwareDevTaxNumber>12345678</softwareDevTaxNumber>
                </software>
                <page>${page}</page>
                <invoiceDirection>${direction}</invoiceDirection>
                <invoiceQueryParams>
                    <mandatoryQueryParams>
                        <invoiceIssueDate>
                            <dateFrom>${dateFrom}</dateFrom>
                            <dateTo>${dateTo}</dateTo>
                        </invoiceIssueDate>
                    </mandatoryQueryParams>
                </invoiceQueryParams>
            </QueryInvoiceDigestRequest>
        `;
        const response = await axios_1.default.post(`${this.API_URL}/queryInvoiceDigest`, xmlRequest, {
            headers: { 'Content-Type': 'application/xml' },
        });
        return this.parseDigestResponse(response.data);
    }
    async parseDigestResponse(xmlData) {
        var _a, _b;
        const parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: true,
            tagNameProcessors: [xml2js.processors.stripPrefix]
        });
        const result = await parser.parseStringPromise(xmlData);
        const response = result.QueryInvoiceDigestResponse;
        if (!response)
            throw new Error('Nincs NAV válasz');
        const invoiceDigests = Array.isArray((_a = response.invoiceDigestResult) === null || _a === void 0 ? void 0 : _a.invoiceDigest)
            ? response.invoiceDigestResult.invoiceDigest.map(this.mapInvoiceDigest)
            : ((_b = response.invoiceDigestResult) === null || _b === void 0 ? void 0 : _b.invoiceDigest)
                ? [this.mapInvoiceDigest(response.invoiceDigestResult.invoiceDigest)]
                : [];
        return {
            currentPage: parseInt(response.currentPage, 10),
            availablePage: parseInt(response.availablePage, 10),
            invoiceDigests,
        };
    }
    mapInvoiceDigest(digest) {
        return {
            invoiceNumber: digest.invoiceNumber,
            supplierTaxNumber: digest.supplierTaxNumber,
            supplierName: digest.supplierName || '',
            customerTaxNumber: digest.customerTaxNumber || '',
            customerName: digest.customerName || '',
            issueDate: digest.invoiceIssueDate,
            deliveryDate: digest.invoiceDeliveryDate || '',
            dueDate: digest.paymentDate || '',
            netAmount: digest.invoiceNetAmount || '0',
            vatAmount: digest.invoiceVatAmount || '0',
            grossAmount: (parseFloat(digest.invoiceNetAmount || '0') + parseFloat(digest.invoiceVatAmount || '0')).toString(),
            currency: digest.currency || 'HUF',
            exchangeRate: digest.exchangeRate || '',
            netAmountHUF: digest.invoiceNetAmountHUF || '0',
            vatAmountHUF: digest.invoiceVatAmountHUF || '0',
            grossAmountHUF: (parseFloat(digest.invoiceNetAmountHUF || '0') + parseFloat(digest.invoiceVatAmountHUF || '0')).toString(),
        };
    }
    async queryInvoiceData(invoiceNumber, direction) {
        const requestId = `RID${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
        const timestamp = this.getTimestamp();
        const cleanTimestamp = timestamp.replace(/[^0-9]/g, '');
        const signature = this.sha3_512(requestId + cleanTimestamp + this.authData.signKey);
        const xmlRequest = `
            <QueryInvoiceDataRequest xmlns="http://schemas.nav.gov.hu/OSA/3.0/api">
                <common:header xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
                    <common:requestId>${requestId}</common:requestId>
                    <common:timestamp>${timestamp}</common:timestamp>
                    <common:requestVersion>3.0</common:requestVersion>
                    <common:headerVersion>1.0</common:headerVersion>
                </common:header>
                <common:user xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
                    <common:login>${this.authData.login}</common:login>
                    <common:passwordHash cryptoType="SHA-512">${this.sha512(this.authData.password)}</common:passwordHash>
                    <common:taxNumber>${this.authData.taxNumber}</common:taxNumber>
                    <common:requestSignature cryptoType="SHA3-512">${signature}</common:requestSignature>
                </common:user>
                <software>
                    <softwareId>123456789123456789</softwareId>
                    <softwareName>n8n</softwareName>
                    <softwareOperation>ONLINE_SERVICE</softwareOperation>
                    <softwareMainVersion>1.0</softwareMainVersion>
                    <softwareDevName>Fejlesztő</softwareDevName>
                    <softwareDevContact>kapcsolat@example.com</softwareDevContact>
                    <softwareDevCountryCode>HU</softwareDevCountryCode>
                    <softwareDevTaxNumber>12345678</softwareDevTaxNumber>
                </software>
                <invoiceNumberQuery>
                    <invoiceNumber>${invoiceNumber}</invoiceNumber>
                    <invoiceDirection>${direction}</invoiceDirection>
                </invoiceNumberQuery>
            </QueryInvoiceDataRequest>
        `;
        const response = await axios_1.default.post(`${this.API_URL}/queryInvoiceData`, xmlRequest, {
            headers: { 'Content-Type': 'application/xml' },
            timeout: 30000,
        });
        return this.parseInvoiceResponse(response.data);
    }
    async parseInvoiceResponse(xmlData) {
        var _a, _b, _c, _d, _e, _f;
        const parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: true,
            tagNameProcessors: [xml2js.processors.stripPrefix]
        });
        const result = await parser.parseStringPromise(xmlData);
        const response = result.QueryInvoiceDataResponse;
        if (!((_a = response === null || response === void 0 ? void 0 : response.invoiceDataResult) === null || _a === void 0 ? void 0 : _a.invoice)) {
            throw new Error('');
        }
        return {
            invoiceNumber: response.invoiceDataResult.invoice.invoiceNumber || '',
            issueDate: response.invoiceDataResult.invoice.invoiceIssueDate || '',
            supplierName: ((_b = response.invoiceDataResult.invoice.supplierInfo) === null || _b === void 0 ? void 0 : _b.supplierName) || '',
            customerName: ((_c = response.invoiceDataResult.invoice.customerInfo) === null || _c === void 0 ? void 0 : _c.customerName) || '',
            netAmount: ((_d = response.invoiceDataResult.invoice.invoiceSummary) === null || _d === void 0 ? void 0 : _d.invoiceNetAmount) || '0',
            vatAmount: ((_e = response.invoiceDataResult.invoice.invoiceSummary) === null || _e === void 0 ? void 0 : _e.invoiceVatAmount) || '0',
            grossAmount: ((_f = response.invoiceDataResult.invoice.invoiceSummary) === null || _f === void 0 ? void 0 : _f.invoiceGrossAmount) || '0',
        };
    }
}
// Helper függvények
async function processQuery(authData, adoszam, datumTol, datumIg, tipus, mod) {
    const client = new NavClient(authData);
    const direction = tipus === 'inbound' ? 'INBOUND' : 'OUTBOUND';
    const isDetailed = mod === 'reszletes';
    const digest = await client.queryInvoiceDigest(direction, datumTol, datumIg);
    let invoices = digest.invoiceDigests || [];
    if (isDetailed) {
        invoices = await getDetailedInvoices(client, invoices, direction);
    }
    return invoices;
}
async function getDetailedInvoices(client, invoices, direction) {
    const detailedInvoices = [];
    for (const [index, invoice] of invoices.entries()) {
        if (index > 0)
            await new Promise(resolve => setTimeout(resolve, 300));
        try {
            const detailed = await client.queryInvoiceData(invoice.invoiceNumber, direction);
            detailedInvoices.push({ ...invoice, ...detailed });
        }
        catch (error) {
            detailedInvoices.push({
                ...invoice,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    return detailedInvoices;
}
class NavInvoiceQuery {
    constructor() {
        this.description = {
            displayName: 'NAV Számla lekérdező',
            name: 'NAV Számla lekérdező',
            icon: 'file:icons/nav-logo.svg',
            group: ['transform'],
            version: 1,
            description: 'NAV számlák lekérdezése',
            defaults: {
                name: 'NAV Számla lekérdező',
            },
            credentials: [
                {
                    name: 'navInvoiceApi',
                    required: true,
                },
            ],
            inputs: ['main'],
            outputs: ['main'],
            properties: [
                {
                    displayName: 'Adószám',
                    name: 'adoszam',
                    type: 'options',
                    typeOptions: {
                        loadOptionsMethod: 'getTaxNumbers',
                    },
                    default: '',
                    required: false,
                },
                {
                    displayName: 'Dátum -tól',
                    name: 'datumTol',
                    type: 'dateTime',
                    default: '',
                    description: 'YYYY-MM-DD formátumban, nem kötelező itt megadni, tesztelésre van, INPUT json elem.',
                    required: false,
                },
                {
                    displayName: 'Dátum -ig',
                    name: 'datumIg',
                    type: 'dateTime',
                    default: '',
                    description: 'YYYY-MM-DD formátumban, nem kötelező itt megadni, tesztelésre van, INPUT json elem.',
                    required: false,
                },
                {
                    displayName: 'Számlatípus',
                    name: 'tipus',
                    type: 'options',
                    options: [
                        { name: 'Szállító számlák', value: 'inbound' },
                        { name: 'Vevő számlák', value: 'outbound' },
                    ],
                    default: 'inbound',
                },
                {
                    displayName: 'Lekérdezés részletessége',
                    name: 'mod',
                    type: 'options',
                    options: [
                        { name: 'Fejléc adatok', value: 'fejlec' },
                        { name: 'Részletes számlák', value: 'reszletes' },
                    ],
                    default: 'fejlec',
                },
                {
                    displayName: 'Leírás (használati útmutató)',
                    name: 'helpText',
                    type: 'string',
                    typeOptions: {
                        allowExpressions: true,
                        alwaysOpenEditWindow: true,
                    },
                    default: '+ Create new credential: csatlakozási adatok megadása.\n\r Példa input JSON:\n{\n  "datumTol": "2025-03-01",\n  "datumIg": "2025-04-01",\n  "tipus": "inbound", vagy "outbound"\n  "mod": "reszletes", vagy "fejlec"\n  "adoszam": "12345678"\n}\n\nA kimenet JSON, ami továbbítható Excel, SQL, stb. irányba.',
                    description: 'Használati példa',
                },
            ],
        };
        this.methods = {
            loadOptions: {
                async getTaxNumbers() {
                    const credentials = await this.getCredentials('navInvoiceApi');
                    return [
                        {
                            name: `${credentials.name} ${credentials.taxNumber} - Számlák ehhez a céghez`,
                            value: credentials.taxNumber
                        }
                    ];
                },
            },
        };
    }
    async execute() {
        var _a, _b, _c, _d, _e;
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const datumTol = (_a = item.json.datumTol) !== null && _a !== void 0 ? _a : this.getNodeParameter('datumTol', i);
            const datumIg = (_b = item.json.datumIg) !== null && _b !== void 0 ? _b : this.getNodeParameter('datumIg', i);
            const tipus = (_c = item.json.tipus) !== null && _c !== void 0 ? _c : this.getNodeParameter('tipus', i);
            const mod = (_d = item.json.mod) !== null && _d !== void 0 ? _d : this.getNodeParameter('mod', i);
            const adoszam = (_e = item.json.adoszam) !== null && _e !== void 0 ? _e : this.getNodeParameter('adoszam', i);
            const formattedDatumTol = new Date(String(datumTol)).toISOString().split('T')[0];
            const formattedDatumIg = new Date(String(datumIg)).toISOString().split('T')[0];
            try {
                const credentials = await this.getCredentials('navInvoiceApi');
                const invoices = await processQuery(credentials, String(adoszam), formattedDatumTol, formattedDatumIg, String(tipus), String(mod));
                for (const invoice of invoices) {
                    returnData.push({ json: invoice });
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error instanceof Error ? error.message : String(error)
                        }
                    });
                }
                else {
                    throw error;
                }
            }
        }
        return [returnData];
    }
}
module.exports = {
    navInvoiceQuery: NavInvoiceQuery
};
//# sourceMappingURL=navInvoiceQuery.node.js.map