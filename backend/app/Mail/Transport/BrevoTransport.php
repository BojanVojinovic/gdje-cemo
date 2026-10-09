<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\MessageConverter;

class BrevoTransport extends AbstractTransport
{
    public function __construct(private readonly string $key)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        if ($this->key === '') {
            throw new TransportException('Brevo API key is missing.');
        }

        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $from = $email->getFrom()[0] ?? null;
        $payload = [
            'sender' => array_filter([
                'email' => $from?->getAddress() ?: config('mail.from.address'),
                'name' => $from?->getName() ?: config('mail.from.name'),
            ]),
            'to' => $this->recipients($email->getTo()),
            'subject' => $email->getSubject() ?? '',
        ];

        if ($html = $email->getHtmlBody()) {
            $payload['htmlContent'] = $html;
        }
        if ($text = $email->getTextBody()) {
            $payload['textContent'] = $text;
        }
        if (! isset($payload['htmlContent']) && ! isset($payload['textContent'])) {
            $payload['textContent'] = '';
        }

        $response = Http::timeout(10)
            ->withHeaders([
                'api-key' => $this->key,
                'accept' => 'application/json',
            ])
            ->post('https://api.brevo.com/v3/smtp/email', $payload);

        if ($response->failed()) {
            throw new TransportException('Brevo rejected the message ('.$response->status().').');
        }
    }

    /**
     * @param  array<int, Address>  $addresses
     * @return array<int, array{email: string, name?: string}>
     */
    private function recipients(array $addresses): array
    {
        return array_map(function (Address $address) {
            return array_filter([
                'email' => $address->getAddress(),
                'name' => $address->getName(),
            ]);
        }, $addresses);
    }

    public function __toString(): string
    {
        return 'brevo';
    }
}
