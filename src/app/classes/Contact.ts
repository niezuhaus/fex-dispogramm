import {Client} from "./Client";
import {Geolocation} from "./Geolocation";

export class Contact {
  location: Geolocation;
  client: Client;
  email: string;
  id: string;
  info: string;
  name: string;
  phone: string;
  type: string;

  constructor(data?: Partial<Contact>) {
    if (data) {
      Object.assign(this, data);
      this.client = this.client ? new Client(this.client) : null;
      this.location = this.location ? new Geolocation(this.location) : null;
    }
  }
}
