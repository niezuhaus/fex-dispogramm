import {Component, EventEmitter, Inject, OnInit, Output} from '@angular/core';
import {Contact} from "../classes/Contact";
import {GC} from "../common/GC";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {Client} from "../classes/Client";

@Component({
  selector: 'app-edit-contact-dialog',
  template: `
    <div>
      <h1 mat-dialog-title>neuen kontakt erstellen</h1>
      <div mat-dialog-content style="width: 300px">
        <mat-form-field class="w-100">
          <mat-label>name</mat-label>
          <input
            #name
            type="text"
            matInput
            [(ngModel)]="contact.name"
            autofocus>
        </mat-form-field>
        <mat-form-field class="w-100">
          <mat-label>telefon</mat-label>
          <input
            #nick
            type="text"
            matInput
            [(ngModel)]="contact.phone"
            (focus)="nick.select()"
            autofocus>
          <mat-error>
            die mailadresse ist ungültig
          </mat-error>
        </mat-form-field>
        <mat-form-field class="w-100">
          <mat-label>e-mail</mat-label>
          <input
            type="email"
            email
            matInput
            [(ngModel)]="contact.email">
          <mat-error>
            die mailadresse ist ungültig
          </mat-error>
        </mat-form-field>
        <mat-form-field class="w-100">
          <mat-label>weitere infos</mat-label>
          <textarea matInput [(ngModel)]="contact.info"></textarea>
        </mat-form-field>
      </div>
      <button mat-raised-button class="fex-button" (click)="this.save()" matDialogClose="true">
        speichern
      </button>
    </div>
  `,
  styles: []
})
export class ContactDialogComponent implements OnInit {

  contact: Contact = new Contact();
  client: Client;

  @Output() created = new EventEmitter<Contact>();
  @Output() updated = new EventEmitter<Contact>();
  @Output() deleted = new EventEmitter<boolean>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      contact: Contact;
      client: Client;
    }
  ) {
    if (data.contact) {
      this.contact = data.contact
    }
    if (data.client) {
      this.client = data.client
    }
  }

  ngOnInit(): void {
  }

  save(): void {
    if (!this.contact.client) {
      this.contact.client = this.client;
    }
    GC.http.createContact(this.contact).subscribe(msg => {
      this.created.emit(msg);
      GC.openSnackBarLong(`${msg.name} wurde als kontakt angelegt`)
    })
  }
}
