import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'; 
import { IExecuteFunctions } from 'n8n-core';
import axios, { AxiosRequestConfig } from 'axios';
import { parseStringPromise } from 'xml2js';
import * as crypto from 'crypto';
import * as forge from 'node-forge';

interface QueryItem {
  adoszam: string;
  datumTol: string;
  datumIg: string;
  tipus: string;
}

interface NavCredential {
  login: string;
  password?: string; // Lehet, hogy nem tároljuk a jelszót, hanem csak a hash-t
  taxNumber: string;
  signKey: string;
}

export class NavSzamlaLekerdezo implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'NAV Számla Lekérdező',
    name: 'navSzamlaLekerdezo',
    group: ['transform'],
    version: 1.0,
    description: 'Lekérdezi a NAV Online Számla adatait',
    defaults: {
      name: 'NAV Számla Lekérdezés',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'navApi',
        required: true,
        displayOptions: {
          show: {
            authentication: ['navApi'],
          },
        },
      },
    ],
    properties: [
      {
        displayName: 'Authentication Method',
        name: 'authentication',
        type: 'options',
        options: [
          {
            name: 'NAV API',
            value: 'navApi',
            description: 'Authenticate with NAV API credentials',
          },
        ],
        default: 'navApi',
      },
      {
        displayName: 'Lekérdezési Tételek',
        name: 'lekérdezések',
        type: 'json',
        default: '[]',
        description: 'A lekérdezési paraméterek JSON formátumban',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lekerdezesekString = this.getNodeParameter('lekérdezések', i) as string;
      let lekerdezesek: QueryItem[] = [];

      try {
        lekerdezesek = JSON.parse(lekerdezesekString);
      } catch (error) {
        throw new Error(`Érvénytelen JSON formátum a lekérdezéseknél: ${error}`);
      }

      for (const lekerdezes of lekerdezesek) {
        const { adoszam, datumTol, datumIg, tipus } = lekerdezes;

        try {
          const eredmenyek = await this.lekerdezNavSzamla(adoszam, datumTol, datumIg, tipus, i);

          returnData.push({
            json: {
              adoszam,
              datumTol,
              datumIg,
              tipus,
              szamlak: eredmenyek,
            },
            pairedItem: {
              item: i,
            },
          });
        } catch (error) {
          console.error(`Hiba a lekérdezés során (${adoszam}, ${datumTol} - ${datumIg}, ${tipus}): ${error}`);

          returnData.push({
            json: {
              adoszam,
              datumTol,
              datumIg,
              tipus,
              error: error.message,
            },
            pairedItem: {
              item: i,
            },
          });
        }

        // Rate limit kezelés (4 mp szünet cégenként)
        if (lekerdezesek.length > 1 || adoszam === 'all') {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      }
    }

    return this.prepareOutputData(returnData);
  }

  async lekerdezNavSzamla(
    adoszam: string,
    datumTol: string,
    datumIg: string,
    tipus: string,
    itemIndex: number
  ): Promise<any[]> {
    const apiUrl = 'https://api.onlineszamla.nav.gov.hu/invoiceService/v3'; // API URL
    const credential = await this.getCredentials('navApi', itemIndex) as NavCredential;

    if (!credential) {
      throw new Error('NAV API hitelesítési adatok nincsenek beállítva.');
    }

    const { login, taxNumber, signKey } = credential;
    const passwordHash = this.sha512(credential.password || ''); // Feltételezzük, hogy a jelszó hash-elve van

    const softwareData = {
      softwareId: 'n8n-nav-plugin',
      softwareName: 'n8n NAV Plugin',
      softwareOperation: 'ONLINE_SERVICE',
      softwareMainVersion: '1.0.0',
      softwareDevName: 'n8n Plugin Developer',
      softwareDevContact: 'developer@example.com',
      softwareDevCountryCode: 'HU',
      softwareDevTaxNumber: '12345678',
    };

    const timestamp = new Date().toISOString().replace(/\..+/, 'Z');
    const requestId = `RID${this.generateRequestId()}`;
    const cleanTs = timestamp.replace(/[^0-9]/g, '');
    const signature = this.sha3_512(requestId + cleanTs + signKey);

    let requestXml: string = '';

    if (tipus === 'fejlec' || tipus === 'reszletes') {
      const direction = tipus === 'fejlec' ? 'OUTBOUND' : 'INBOUND'; // Példa, igazítsd a logikához
      requestXml = this.createDigestRequest(
        requestId,
        timestamp,
        login,
        passwordHash,
        taxNumber,
        softwareData,
        direction,
        datumTol,
        datumIg,
        signature
      );
    } else {
      throw new Error(`Érvénytelen lekérdezés típus: ${tipus}`);
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
      },
    };

    try {
      const response = await axios.post(apiUrl + '/queryInvoiceDigest', requestXml, config);

      if (response.status !== 200) {
        throw new Error(`NAV API hiba: ${response.status} - ${response.statusText}`);
      }

      const parsedData = await this.parseXmlResponse(response.data);
      return parsedData;
    } catch (error) {
      throw new Error(`API hívás sikertelen: ${error.message}`);
    }
  }

  createDigestRequest(
    requestId: string,
    timestamp: string,
    login: string,
    passwordHash: string,
    taxNumber: string,
    softwareData: any,
    direction: string,
    dateFrom: string,
    dateTo: string,
    signature: string
  ): string {
    const nsCommon = 'http://schemas.nav.gov.hu/NTCA/1.0/common';
    const nsApi = 'http://schemas.nav.gov.hu/OSA/3.0/api';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <QueryInvoiceDigestRequest xmlns="${nsApi}" xmlns:common="${nsCommon}">
        <header>
            <requestId>${requestId}</requestId>
            <timestamp>${timestamp}</timestamp>
            <requestVersion>3.0</requestVersion>
            <headerVersion>1.0</headerVersion>
        </header>
        <user>
            <login>${login}</login>
            <passwordHash cryptoType="SHA-512">${passwordHash}</passwordHash>
            <taxNumber>${taxNumber}</taxNumber>
            <requestSignature cryptoType="SHA3-512">${signature}</requestSignature>
        </user>
        <software>
            <softwareId>${softwareData.softwareId}</softwareId>
            <softwareName>${softwareData.softwareName}</softwareName>
            <softwareOperation>${softwareData.softwareOperation}</softwareOperation>
            <softwareMainVersion>${softwareData.softwareMainVersion}</softwareMainVersion>
            <softwareDevName>${softwareData.softwareDevName}</softwareDevName>
            <softwareDevContact>${softwareData.softwareDevContact}</softwareDevContact>
            <softwareDevCountryCode>${softwareData.softwareDevCountryCode}</softwareDevCountryCode>
            <softwareDevTaxNumber>${softwareData.softwareDevTaxNumber}</softwareDevTaxNumber>
        </software>
        <page>1</page>
        <invoiceDirection>${direction}</invoiceDirection>
        <invoiceQueryParams>
            <mandatoryQueryParams>
                <invoiceIssueDate>
                    <dateFrom>${dateFrom}</dateFrom>
                    <dateTo>${dateTo}</dateTo>
                </invoiceIssueDate>
            </mandatoryQueryParams>
        </invoiceQueryParams>
    </QueryInvoiceDigestRequest>`;

    return xml;
  }

  async parseXmlResponse(xml: string): Promise<any> {
    try {
      const result = await parseStringPromise(xml, { explicitArray: false });
      // Itt kell feldolgozni a NAV API válaszát, és kinyerni a szükséges adatokat
      // Példa:
      // const invoiceDigests = result['QueryInvoiceDigestResponse']['invoiceDigest'];
      return result; // Módosítsd az adatok kinyerésére és formázására
    } catch (error) {
      throw new Error(`XML parse hiba: ${error.message}`);
    }
  }

  sha3_512(data: string): string {
    return crypto.createHash('sha3-512').update(data).digest('hex').toUpperCase();
  }

  sha512(data: string): string {
    return crypto.createHash('sha512').update(data).digest('hex').toUpperCase();
  }

  generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }
  private prepareOutputData(returnData: INodeExecutionData[]): INodeExecutionData[][] {
    return [returnData];
  }
}
 
 

interface QueryItem {
  adoszam: string;
  datumTol: string;
  datumIg: string;
  tipus: string;
}

interface NavCredential {
  login: string;
  password?: string; // Lehet, hogy nem tároljuk a jelszót, hanem csak a hash-t
  taxNumber: string;
  signKey: string;
}

export class NavSzamlaLekerdezo implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'NAV Számla Lekérdező',
    name: 'navSzamlaLekerdezo',
    group: ['transform'],
    version: 1.0,
    description: 'Lekérdezi a NAV Online Számla adatait',
    defaults: {
      name: 'NAV Számla Lekérdezés',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'navApi',
        required: true,
        displayOptions: {
          show: {
            authentication: ['navApi'],
          },
        },
      },
    ],
    properties: [
      {
        displayName: 'Authentication Method',
        name: 'authentication',
        type: 'options',
        options: [
          {
            name: 'NAV API',
            value: 'navApi',
            description: 'Authenticate with NAV API credentials',
          },
        ],
        default: 'navApi',
      },
      {
        displayName: 'Lekérdezési Tételek',
        name: 'lekérdezések',
        type: 'json',
        default: '[]',
        description: 'A lekérdezési paraméterek JSON formátumban',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lekerdezesekString = this.getNodeParameter('lekérdezések', i) as string;
      let lekerdezesek: QueryItem[] = [];

      try {
        lekerdezesek = JSON.parse(lekerdezesekString);
      } catch (error) {
        throw new Error(`Érvénytelen JSON formátum a lekérdezéseknél: ${error}`);
      }

      for (const lekerdezes of lekerdezesek) {
        const { adoszam, datumTol, datumIg, tipus } = lekerdezes;

        try {
          const eredmenyek = await this.lekerdezNavSzamla(adoszam, datumTol, datumIg, tipus, i);

          returnData.push({
            json: {
              adoszam,
              datumTol,
              datumIg,
              tipus,
              szamlak: eredmenyek,
            },
            pairedItem: {
              item: i,
            },
          });
        } catch (error) {
          console.error(`Hiba a lekérdezés során (${adoszam}, ${datumTol} - ${datumIg}, ${tipus}): ${error}`);

          returnData.push({
            json: {
              adoszam,
              datumTol,
              datumIg,
              tipus,
              error: error.message,
            },
            pairedItem: {
              item: i,
            },
          });
        }

        // Rate limit kezelés (4 mp szünet cégenként)
        if (lekerdezesek.length > 1 || adoszam === 'all') {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      }
    }

    return this.prepareOutputData(returnData);
  }

  async lekerdezNavSzamla(
    adoszam: string,
    datumTol: string,
    datumIg: string,
    tipus: string,
    itemIndex: number
  ): Promise<any[]> {
    const apiUrl = 'https://api.onlineszamla.nav.gov.hu/invoiceService/v3'; // API URL
    const credential = await this.getCredentials('navApi', itemIndex) as NavCredential;

    if (!credential) {
      throw new Error('NAV API hitelesítési adatok nincsenek beállítva.');
    }

    const { login, taxNumber, signKey } = credential;
    const passwordHash = this.sha512(credential.password || ''); // Feltételezzük, hogy a jelszó hash-elve van

    const softwareData = {
      softwareId: 'n8n-nav-plugin',
      softwareName: 'n8n NAV Plugin',
      softwareOperation: 'ONLINE_SERVICE',
      softwareMainVersion: '1.0.0',
      softwareDevName: 'n8n Plugin Developer',
      softwareDevContact: 'developer@example.com',
      softwareDevCountryCode: 'HU',
      softwareDevTaxNumber: '12345678',
    };

    const timestamp = new Date().toISOString().replace(/\..+/, 'Z');
    const requestId = `RID${this.generateRequestId()}`;
    const cleanTs = timestamp.replace(/[^0-9]/g, '');
    const signature = this.sha3_512(requestId + cleanTs + signKey);

    let requestXml: string = '';

    if (tipus === 'fejlec' || tipus === 'reszletes') {
      const direction = tipus === 'fejlec' ? 'OUTBOUND' : 'INBOUND'; // Példa, igazítsd a logikához
      requestXml = this.createDigestRequest(
        requestId,
        timestamp,
        login,
        passwordHash,
        taxNumber,
        softwareData,
        direction,
        datumTol,
        datumIg,
        signature
      );
    } else {
      throw new Error(`Érvénytelen lekérdezés típus: ${tipus}`);
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
      },
    };

    try {
      const response = await axios.post(apiUrl + '/queryInvoiceDigest', requestXml, config);

      if (response.status !== 200) {
        throw new Error(`NAV API hiba: ${response.status} - ${response.statusText}`);
      }

      const parsedData = await this.parseXmlResponse(response.data);
      return parsedData;
    } catch (error) {
      throw new Error(`API hívás sikertelen: ${error.message}`);
    }
  }

  createDigestRequest(
    requestId: string,
    timestamp: string,
    login: string,
    passwordHash: string,
    taxNumber: string,
    softwareData: any,
    direction: string,
    dateFrom: string,
    dateTo: string,
    signature: string
  ): string {
    const nsCommon = 'http://schemas.nav.gov.hu/NTCA/1.0/common';
    const nsApi = 'http://schemas.nav.gov.hu/OSA/3.0/api';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <QueryInvoiceDigestRequest xmlns="${nsApi}" xmlns:common="${nsCommon}">
        <header>
            <requestId>${requestId}</requestId>
            <timestamp>${timestamp}</timestamp>
            <requestVersion>3.0</requestVersion>
            <headerVersion>1.0</headerVersion>
        </header>
        <user>
            <login>${login}</login>
            <passwordHash cryptoType="SHA-512">${passwordHash}</passwordHash>
            <taxNumber>${taxNumber}</taxNumber>
            <requestSignature cryptoType="SHA3-512">${signature}</requestSignature>
        </user>
        <software>
            <softwareId>${softwareData.softwareId}</softwareId>
            <softwareName>${softwareData.softwareName}</softwareName>
            <softwareOperation>${softwareData.softwareOperation}</softwareOperation>
            <softwareMainVersion>${softwareData.softwareMainVersion}</softwareMainVersion>
            <softwareDevName>${softwareData.softwareDevName}</softwareDevName>
            <softwareDevContact>${softwareData.softwareDevContact}</softwareDevContact>
            <softwareDevCountryCode>${softwareData.softwareDevCountryCode}</softwareDevCountryCode>
            <softwareDevTaxNumber>${softwareData.softwareDevTaxNumber}</softwareDevTaxNumber>
        </software>
        <page>1</page>
        <invoiceDirection>${direction}</invoiceDirection>
        <invoiceQueryParams>
            <mandatoryQueryParams>
                <invoiceIssueDate>
                    <dateFrom>${dateFrom}</dateFrom>
                    <dateTo>${dateTo}</dateTo>
                </invoiceIssueDate>
            </mandatoryQueryParams>
        </invoiceQueryParams>
    </QueryInvoiceDigestRequest>`;

    return xml;
  }

  async parseXmlResponse(xml: string): Promise<any> {
    try {
      const result = await parseStringPromise(xml, { explicitArray: false });
      // Itt kell feldolgozni a NAV API válaszát, és kinyerni a szükséges adatokat
      // Példa:
      // const invoiceDigests = result['QueryInvoiceDigestResponse']['invoiceDigest'];
      return result; // Módosítsd az adatok kinyerésére és formázására
    } catch (error) {
      throw new Error(`XML parse hiba: ${error.message}`);
    }
  }

  sha3_512(data: string): string {
    return crypto.createHash('sha3-512').update(data).digest('hex').toUpperCase();
  }

  sha512(data: string): string {
    return crypto.createHash('sha512').update(data).digest('hex').toUpperCase();
  }

  generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }
  private prepareOutputData(returnData: INodeExecutionData[]): INodeExecutionData[][] {
    return [returnData];
  }
}
 
