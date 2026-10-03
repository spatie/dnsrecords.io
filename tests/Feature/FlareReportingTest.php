<?php

namespace Tests\Feature;

use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Spatie\FlareClient\Flare;
use Spatie\FlareClient\FlareConfig;
use Tests\TestCase;
use Throwable;

class FlareReportingTest extends TestCase
{
    #[Test]
    public function it_reports_exceptions_to_flare(): void
    {
        app(FlareConfig::class)->apiToken = 'fake-flare-key';

        $flare = Mockery::spy(Flare::class);
        app()->instance(Flare::class, $flare);

        report(new RuntimeException('Something went wrong'));

        $flare->shouldHaveReceived('report')
            ->withArgs(fn (Throwable $exception) => $exception->getMessage() === 'Something went wrong')
            ->once();
    }
}
