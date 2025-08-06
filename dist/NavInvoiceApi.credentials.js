"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class NavInvoiceApi {
    constructor() {
        this.name = 'navInvoiceApi';
        this.displayName = 'NAV számla API Credentials';
        // @ts-ignore
        this.icon = 'file:icons/nav-logo.svg';
        this.properties = [
            {
                displayName: 'Cégnév',
                name: 'name',
                type: 'string',
                default: '',
                placeholder: 'Cégem',
            },
            {
                displayName: 'Adószám',
                name: 'taxNumber',
                type: 'string',
                default: '',
            },
            {
                displayName: 'NAV Felhasználónév',
                name: 'login',
                type: 'string',
                default: '',
                required: true,
            },
            {
                displayName: 'NAV Jelszó',
                name: 'password',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
            },
            {
                displayName: 'Sign Key',
                name: 'signKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
            },
        ];
    }
    async testCredential() {
        return {
            status: 'OK',
            message: 'Credentials mentve',
        };
    }
}
module.exports = {
    NavInvoiceApi: NavInvoiceApi
};
//# sourceMappingURL=NavInvoiceApi.credentials.js.map