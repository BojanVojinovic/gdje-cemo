<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public string $language, public string $email)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: trans('messages.verify_subject', [], $this->language));
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.verification-code',
            with: [
                'code' => $this->code,
                'locale' => $this->language,
                'intro' => trans('messages.verify_body', ['email' => $this->email, 'code' => ''], $this->language),
                'expires' => $this->language === 'cnr' ? 'Kod važi 30 minuta.' : 'The code is valid for 30 minutes.',
            ],
        );
    }
}
