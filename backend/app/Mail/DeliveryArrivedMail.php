<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DeliveryArrivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $language, public string $venueName, public string $address)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: trans('messages.delivery_arrived', [], $this->language));
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.delivery-arrived',
            with: [
                'body' => trans('messages.delivery_arrived_body', ['venue' => $this->venueName], $this->language),
                'address' => $this->address,
            ],
        );
    }
}
