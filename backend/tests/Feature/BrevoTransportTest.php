<?php

namespace Tests\Feature;

use App\Mail\Transport\BrevoTransport;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class BrevoTransportTest extends TestCase
{
    public function test_it_sends_the_message_to_brevo_over_https(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['messageId' => 'abc'], 201),
        ]);

        $transport = new BrevoTransport('test-key');
        $transport->send(
            (new Email)
                ->from(new Address('sender@example.com', 'Shall We'))
                ->to(new Address('guest@example.com', 'Guest'))
                ->subject('Hello')
                ->html('<p>Hi</p>')
        );

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.brevo.com/v3/smtp/email'
                && $request->hasHeader('api-key', 'test-key')
                && $request['sender']['email'] === 'sender@example.com'
                && $request['to'][0]['email'] === 'guest@example.com'
                && $request['subject'] === 'Hello'
                && $request['htmlContent'] === '<p>Hi</p>';
        });
    }
}
