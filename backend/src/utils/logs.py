from logging import Logger, getLogger, StreamHandler, Formatter, DEBUG, INFO


def setup_logger(name: str, level: int = INFO) -> Logger:
    logger = getLogger(name)
    logger.setLevel(level)

    handler = StreamHandler()
    handler.setLevel(level)

    formatter = Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)

    if not logger.hasHandlers():
        logger.addHandler(handler)

    return logger


app_logger = setup_logger('app_logger', level=INFO)
auth_logger = setup_logger('auth_logger', level=INFO)
analytics_logger = setup_logger('analytics_logger', level=INFO)
jobs_logger = setup_logger('jobs_logger', level=INFO)
subscriptions_logger = setup_logger('subscriptions_logger', level=INFO)
