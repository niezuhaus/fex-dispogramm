import {Client} from "./Client";
import {Job} from "./Job";

export interface LexInvoiceListPage {
  content: LexInvoiceShort[],
  first: boolean,
  last: boolean,
  totalPages: number,
  totalElements: number,
  numberOfElements: number,
  size: number,
  number: number,
  sort: {
    property: string,
    direction: string,
    ignoreCase: boolean,
    nullHandling: "NATIVE",
    ascending: boolean
  }[]
}

export class LexInvoice {
  id: string;
  organizationId: string
  createdDate: Date;
  updatedDate: Date;
  version: number;
  language: string;
  archived: boolean;
  voucherStatus: 'draft' | 'open' | 'paid' | 'voided'
  voucherNumber: string;
  voucherDate: Date; // required
  dueDate: Date;
  address: LexAddress; // required
  xRechnung: { buyerReference: string }; // required
  lineItems: LineItem[]; // required
  totalPrice: { // required
    currency: 'EUR',
    totalNetAmount: number,
    totalGrossAmount: number,
    totalTaxAmount: number,
    totalDiscountAbsolute?: number,
    totalDiscountPercentage?: number,
  };
  taxAmounts: {
    taxRatePercentage: number,
    taxAmount: number,
    netAmount: number
  };
  taxConditions: { // required
    taxType:
      "net" | "gross" | "vatfree" |
      "intraCommunitySupply" |
      "constructionService13b" |
      "externalService13b" |
      "thirdPartyCountryService" |
      "thirdPartyCountryDelivery" |
      "photovoltaicEquipment",
    taxSubType?: 'distanceSales' | 'electronicServices',
    taxTypeNote?: string,
  }
  paymentConditions: {
    paymentTermLabel: string;
    paymentTermLabelTemplate: string;
    paymentTermDuration: string;
    paymentDiscountConditions: {
      discountPercentage: number,
      discountRange: number,
    }
  }
  shippingConditions: { // required
    shippingDate: Date;
    shippingEndDate?: Date;
    shippingType: 'service' | 'serviceperiod' | 'delivery' | 'deliveryperiod',
  }
  closingInvoice: boolean;
  claimedGrossAmount: number
  downPaymentDeductions: {
    id: string;
    voucherType: string;
    title: string;
    voucherNumber: string;
    voucherDate: Date;
    receivedGrossAmount: number;
    receivedNetAmount: number;
    receivedTaxAmount: number;
    taxRatePercentage: number;
  }[];
  recurringTemplateId: string;
  relatedVouchers: {
    id: string;
    voucherNumber: string;
    voucherType: string;
  }[];
  title: string;
  introduction: string;
  remark: string;
  files: { id: string }

  constructor(options: {
    date: Date,
    client: Client,
    xRechnung: boolean,
    jobs: Job[],
    lexContact: LexContact
  }) {
    this.organizationId = options.lexContact.organizationId;
    this.voucherDate = options.date;
    this.address = {
      contactId: options.lexContact.id,
    }
    this.lineItems = options.jobs.map(job => {
      return {
        type: "custom",
        name: 'Auftrag',
        quantity: 1,
        unitName: 'Mal',
        unitPrice: {
          currency: 'EUR',
          netAmount: job.price._netto,
          taxRatePercentage: 19,
        },
        discountPercentage: 0,
      }
    });

    this.totalPrice = {
      currency: 'EUR',
      totalNetAmount: options.jobs.map(j => j.price._netto).sum(),
      totalGrossAmount: options.jobs.map(j => j.price._netto).sum() * 1.19,
      totalTaxAmount: options.jobs.map(j => j.price._netto).sum() * 0.19,
    }
    this.taxConditions = {
      taxType: "net",
    }
    this.shippingConditions = {
      shippingDate: options.jobs.last().date,
      shippingType: "delivery"
    }
  }
}

export interface LexCreateResponse {
  id: string,
  resourceUri: string,
  createdDate: Date,
  updatedDate: Date,
  version: 1
}

export class LexAddress {
  contactId?: string; // when provided, all other fields are not to be provided
  name?: string
  supplement?: string;
  street?: string;
  city?: string;
  zip?: string;
  countryCode?: 'DE';
}

export class LineItem {
  id?: string;
  type: 'service' | 'material' | 'custom' | 'text';
  name?: string;
  description?: string;
  quantity?: number;
  unitName?: string;
  unitPrice?: {
    currency?: string;
    netAmount?: number;
    grossAmount?: number;
    taxRatePercentage?: number;
  };
  discountPercentage?: number;
  lineItemAmount?: number
}

export interface LexInvoiceShort {
  id: string;
  vouchertType: string;
  voucherStatus: 'draft' | 'open' | 'paid' | 'voided';
  voucherNumber: string;
  voucherDate: Date;
  createdDate: Date;
  updatedDate: Date;
  contactName: string,
  totalAmount: number,
  currency: "EUR",
  archived: boolean,
}

export interface LexContactsListPage {
  content: LexContact[],
  first: boolean,
  last: boolean,
  totalPages: number,
  totalElements: number,
  numberOfElements: number,
  size: number,
  number: number,
  sort: {
    property: string,
    direction: string,
    ignoreCase: boolean,
    nullHandling: string,
    ascending: boolean
  }[]
}

export class LexContact {
  id: string;
  organizationId?: string;
  version = 0;
  roles: {
    customer: {
      number?: number;
    },
    vendor?: {
      number?: number;
    }
  };
  company: LexCompany; // either company or person have to be provided
  person: LexPerson;
  addresses: {
    billing: LexAddress[];
    shipping?: LexAddress[]
  };
  emailAddresses?: {
    business: string[];
    office: string[];
    private: string[];
    other: string[]
  };
  phoneNumbers?: {
    business: string[],
    office: string[],
    mobile: string[],
    private: string[],
    fax: string[],
    other: string[]
  };
  note?: string;
  archived: boolean

  constructor(data: Partial<LexContact>, client?: Client) {
    Object.assign(this, data);
    if (client) {
      this.setClient(client);
    }
  }

  setClient(client: Client): LexContact {
    this.company = new LexCompany();
    this.company.name = client.name;
    this.addresses = {billing: [{
        street: client.street,
        zip: client.zipCode,
        city: client.city,}]}
    this.roles = {customer: {}};
    this.note = client.info;
    return this;
  }
}

export class LexCompany {
  allowTaxFreeInvoices?: boolean;
  name: string;
  taxNumber?: string; // "Steuernummer"
  vatRegistrationId?: string; // "Umsatzsteuer ID"
  contactPersons?: LexCompanyContactPerson[];

  constructor(data?: Partial<LexCompany>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

export interface LexCompanyContactPerson extends LexPerson {
  salutation: string;
  firstName: string;
  lastName: string;
  primary: boolean;
  emailAddress: string;
  phoneNumber: string;
}

export interface LexPerson {
  salutation: string; // max 25 characters
  firstName: string;
  lastName: string;
}
