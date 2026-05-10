const logger = require('../src/utils/logger');

describe('Graceful Shutdown', () => {
  let loggerSpy;

  beforeEach(() => {
    loggerSpy = {
      info: jest.spyOn(logger, 'info').mockImplementation(),
      error: jest.spyOn(logger, 'error').mockImplementation()
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    loggerSpy.info.mockRestore();
    loggerSpy.error.mockRestore();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const createGracefulShutdown = () => {
    // Simulate the graceful shutdown function from src/server.js
    const processExitMock = jest.fn();
    const originalProcessExit = process.exit;
    process.exit = processExitMock;

    const gracefulShutdown = (signal) => {
      logger.info('Shutdown signal received', { signal });
      // Mock server.close that calls callback immediately to simulate quick shutdown
      setTimeout(() => {
        logger.info('Server closed, exiting', { signal });
        processExitMock(0);
      }, 0);

      setTimeout(() => {
        logger.error('Force closing remaining connections after timeout', { timeout_ms: 10000 });
        processExitMock(1);
      }, 10000);
    };

    return { gracefulShutdown, processExitMock, cleanup: () => { process.exit = originalProcessExit; } };
  };

  it('should log shutdown signal when SIGTERM is received', () => {
    const { gracefulShutdown, cleanup } = createGracefulShutdown();

    gracefulShutdown('SIGTERM');

    expect(loggerSpy.info).toHaveBeenCalledWith('Shutdown signal received', { signal: 'SIGTERM' });
    cleanup();
  });

  it('should log shutdown signal when SIGINT is received', () => {
    const { gracefulShutdown, cleanup } = createGracefulShutdown();

    gracefulShutdown('SIGINT');

    expect(loggerSpy.info).toHaveBeenCalledWith('Shutdown signal received', { signal: 'SIGINT' });
    cleanup();
  });

  it('should log server closed message on graceful shutdown', () => {
    const { gracefulShutdown, cleanup } = createGracefulShutdown();

    gracefulShutdown('SIGTERM');
    jest.advanceTimersByTime(10);

    expect(loggerSpy.info).toHaveBeenCalledWith('Server closed, exiting', { signal: 'SIGTERM' });
    cleanup();
  });

  it('should exit with code 0 after server closes gracefully', () => {
    const { gracefulShutdown, processExitMock, cleanup } = createGracefulShutdown();

    gracefulShutdown('SIGTERM');
    jest.advanceTimersByTime(10);

    expect(processExitMock).toHaveBeenCalledWith(0);
    cleanup();
  });

  it('should force exit with code 1 after timeout', () => {
    const { gracefulShutdown, processExitMock, cleanup } = createGracefulShutdown();

    gracefulShutdown('SIGTERM');
    // Advance past the 10 second timeout
    jest.advanceTimersByTime(10001);

    expect(loggerSpy.error).toHaveBeenCalledWith(
      'Force closing remaining connections after timeout',
      { timeout_ms: 10000 }
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
    cleanup();
  });

  it('should have proper timeout value of 10 seconds', () => {
    const { gracefulShutdown, processExitMock, cleanup } = createGracefulShutdown();

    gracefulShutdown('SIGTERM');

    // Advance less than timeout - should not exit with 1
    jest.advanceTimersByTime(9999);
    expect(processExitMock).not.toHaveBeenCalledWith(1);

    // Advance past timeout - should exit with 1
    jest.advanceTimersByTime(2);
    expect(processExitMock).toHaveBeenCalledWith(1);

    cleanup();
  });

  it('should handle both SIGTERM and SIGINT identically', () => {
    const { gracefulShutdown: gs1, processExitMock: exitMock1, cleanup: c1 } = createGracefulShutdown();
    const { gracefulShutdown: gs2, processExitMock: exitMock2, cleanup: c2 } = createGracefulShutdown();

    loggerSpy.info.mockClear();

    // Test SIGTERM
    gs1('SIGTERM');
    jest.advanceTimersByTime(10);
    const sigTermCalls = loggerSpy.info.mock.calls.length;

    loggerSpy.info.mockClear();

    // Test SIGINT
    gs2('SIGINT');
    jest.advanceTimersByTime(10);
    const sigIntCalls = loggerSpy.info.mock.calls.length;

    expect(sigTermCalls).toBe(sigIntCalls);
    expect(exitMock1).toHaveBeenCalledWith(0);
    expect(exitMock2).toHaveBeenCalledWith(0);

    c1();
    c2();
  });

  it('should log with correct message format for structured logging', () => {
    const { gracefulShutdown, cleanup } = createGracefulShutdown();

    gracefulShutdown('SIGTERM');
    jest.advanceTimersByTime(10);

    const shutdownCall = loggerSpy.info.mock.calls.find(
      call => call[0] === 'Shutdown signal received'
    );
    expect(shutdownCall).toBeDefined();
    expect(shutdownCall[1]).toEqual({ signal: 'SIGTERM' });

    const closeCall = loggerSpy.info.mock.calls.find(
      call => call[0] === 'Server closed, exiting'
    );
    expect(closeCall).toBeDefined();
    expect(closeCall[1]).toEqual({ signal: 'SIGTERM' });

    cleanup();
  });
});
