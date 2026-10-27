<?php

declare(strict_types=1);

use Mvr\Auth\AccessPolicy;
use Mvr\Auth\Authenticator;
use Mvr\Auth\TokenService;
use Mvr\Controller;
use Mvr\Config\Env;
use Mvr\Domain\DrawingValidator;
use Mvr\Http\Kernel;
use Mvr\Http\Router;
use Mvr\Repository;
use Mvr\Service;
use Mvr\Storage\FtpStorage;
use Mvr\Storage\LocalStorage;
use Mvr\Storage\Storage;
use Mvr\Support\Clock;
use Mvr\Support\Container;
use Mvr\Support\SystemClock;
use Mvr\Video;

/** All wiring in one place. Tests can build a Container and override any entry. */
return static function (Container $c): void {
    $c->set(Clock::class, fn () => new SystemClock());
    $c->set(\PDO::class, fn () => new \PDO(
        Env::get('DB_DSN', 'mysql:host=127.0.0.1;dbname=mvr;charset=utf8mb4'),
        Env::get('DB_USER', 'root'),
        Env::get('DB_PASSWORD', ''),
        [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
            \PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '+00:00'",
        ],
    ));

    // Repositories
    $c->set(Repository\UserRepository::class, fn (Container $c) => new Repository\PdoUserRepository($c->get(\PDO::class)));
    $c->set(Repository\CategoryRepository::class, fn (Container $c) => new Repository\PdoCategoryRepository($c->get(\PDO::class)));
    $c->set(Repository\MatchRepository::class, fn (Container $c) => new Repository\PdoMatchRepository($c->get(\PDO::class)));
    $c->set(Repository\MarkerRepository::class, fn (Container $c) => new Repository\PdoMarkerRepository($c->get(\PDO::class)));
    $c->set(Repository\RuleRepository::class, fn (Container $c) => new Repository\PdoRuleRepository($c->get(\PDO::class)));

    // Storage + video sources
    $c->set(Storage::class, fn () => Env::get('STORAGE_DRIVER', 'local') === 'ftp'
        ? new FtpStorage(Env::get('FTP_HOST', ''), Env::get('FTP_USER', ''), Env::get('FTP_PASSWORD', ''), Env::get('FTP_ROOT', '/'), Env::get('STORAGE_PUBLIC_URL', ''))
        : new LocalStorage(Env::get('STORAGE_LOCAL_PATH', __DIR__ . '/../public/videos'), Env::get('STORAGE_PUBLIC_URL', '/videos')));
    $c->set(Video\VideoSourceRegistry::class, fn (Container $c) => (new Video\VideoSourceRegistry())
        ->register(new Video\VeoSource(new Video\VeoUrlParser()))
        ->register(new Video\YouTubeSource())
        ->register(new Video\FileSource($c->get(Storage::class))));

    // Auth
    $c->set(TokenService::class, fn (Container $c) => new TokenService(
        Env::get('APP_SECRET'),
        $c->get(Clock::class),
        (int) Env::get('TOKEN_TTL', '1209600'),
    ));
    $c->set(AccessPolicy::class, fn () => new AccessPolicy());
    $c->set(Authenticator::class, fn (Container $c) => new Authenticator($c->get(Repository\UserRepository::class), $c->get(TokenService::class)));

    // Services
    $c->set(DrawingValidator::class, fn () => new DrawingValidator());
    $c->set(Service\MatchService::class, fn (Container $c) => new Service\MatchService(
        $c->get(Repository\MatchRepository::class),
        $c->get(Repository\CategoryRepository::class),
        $c->get(Video\VideoSourceRegistry::class),
        $c->get(AccessPolicy::class),
    ));
    $c->set(Service\MarkerService::class, fn (Container $c) => new Service\MarkerService(
        $c->get(Repository\MarkerRepository::class),
        $c->get(Repository\RuleRepository::class),
        $c->get(Service\MatchService::class),
        $c->get(AccessPolicy::class),
        $c->get(DrawingValidator::class),
        $c->get(Clock::class),
    ));
    $c->set(Service\AnalyticsService::class, fn (Container $c) => new Service\AnalyticsService(
        $c->get(Service\MatchService::class),
        $c->get(Repository\MarkerRepository::class),
        $c->get(Repository\UserRepository::class),
        $c->get(AccessPolicy::class),
    ));
    $c->set(Service\UserService::class, fn (Container $c) => new Service\UserService(
        $c->get(Repository\UserRepository::class),
        $c->get(Repository\CategoryRepository::class),
        $c->get(AccessPolicy::class),
    ));
    $c->set(Service\VideoUploadService::class, fn (Container $c) => new Service\VideoUploadService(
        $c->get(Storage::class),
        $c->get(AccessPolicy::class),
        $c->get(Clock::class),
    ));

    // Controllers
    $c->set(Controller\AuthController::class, fn (Container $c) => new Controller\AuthController($c->get(Authenticator::class)));
    $c->set(Controller\MatchController::class, fn (Container $c) => new Controller\MatchController(
        $c->get(Authenticator::class),
        $c->get(Service\MatchService::class),
        $c->get(Repository\CategoryRepository::class),
        $c->get(Service\AnalyticsService::class),
    ));
    $c->set(Controller\MarkerController::class, fn (Container $c) => new Controller\MarkerController($c->get(Authenticator::class), $c->get(Service\MarkerService::class)));
    $c->set(Controller\RuleController::class, fn (Container $c) => new Controller\RuleController(
        $c->get(Authenticator::class),
        $c->get(Repository\RuleRepository::class),
        $c->get(AccessPolicy::class),
    ));
    $c->set(Controller\UserController::class, fn (Container $c) => new Controller\UserController($c->get(Authenticator::class), $c->get(Service\UserService::class)));
    $c->set(Controller\UploadController::class, fn (Container $c) => new Controller\UploadController($c->get(Authenticator::class), $c->get(Service\VideoUploadService::class)));

    // HTTP
    $c->set(Router::class, fn (Container $c) => (require __DIR__ . '/routes.php')(new Router($c)));
    $c->set(Kernel::class, fn (Container $c) => new Kernel(
        $c->get(Router::class),
        Env::list('CORS_ORIGINS'),
        Env::bool('APP_DEBUG'),
    ));
};
