/// <reference types="@rbxts/testez/globals" />

import { LogLevel, isLevelEnabled, parseLogLevel, getLevelName } from "../src/level";
import { LogRecord, LogRecordBuilder, createLogRecord } from "../src/record";
import { BaseLogger, CompositeLogger, NullLogger, BufferedLogger } from "../src/logger";
import { LogManager, getLogger } from "../src/manager";

export = () => {
	describe("LogLevel", () => {
		it("should parse log levels correctly", () => {
			expect(parseLogLevel("TRACE")).to.equal(LogLevel.Trace);
			expect(parseLogLevel("debug")).to.equal(LogLevel.Debug);
			expect(parseLogLevel("INFO")).to.equal(LogLevel.Info);
			expect(parseLogLevel("warn")).to.equal(LogLevel.Warn);
			expect(parseLogLevel("ERROR")).to.equal(LogLevel.Error);
			expect(parseLogLevel("invalid")).to.equal(undefined);
		});

		it("should check level enablement correctly", () => {
			expect(isLevelEnabled(LogLevel.Error, LogLevel.Info)).to.equal(true);
			expect(isLevelEnabled(LogLevel.Info, LogLevel.Info)).to.equal(true);
			expect(isLevelEnabled(LogLevel.Debug, LogLevel.Info)).to.equal(false);
			expect(isLevelEnabled(LogLevel.Trace, LogLevel.Warn)).to.equal(false);
		});

		it("should get level names correctly", () => {
			expect(getLevelName(LogLevel.Trace)).to.equal("TRACE");
			expect(getLevelName(LogLevel.Debug)).to.equal("DEBUG");
			expect(getLevelName(LogLevel.Info)).to.equal("INFO");
			expect(getLevelName(LogLevel.Warn)).to.equal("WARN");
			expect(getLevelName(LogLevel.Error)).to.equal("ERROR");
		});
	});

	describe("LogRecord", () => {
		it("should create log records with builder", () => {
			const record = new LogRecordBuilder()
				.setLevel(LogLevel.Info)
				.setMessage("Test message")
				.setTarget("test.module")
				.addMetadata("key1", "value1")
				.addMetadata("key2", 123)
				.build();

			expect(record.level).to.equal(LogLevel.Info);
			expect(record.message).to.equal("Test message");
			expect(record.target).to.equal("test.module");
			expect(record.metadata?.key1).to.equal("value1");
			expect(record.metadata?.key2).to.equal(123);
		});

		it("should create log records with helper function", () => {
			const record = createLogRecord(
				LogLevel.Warn,
				"Warning message",
				"warn.module",
				{ foo: "bar" },
			);

			expect(record.level).to.equal(LogLevel.Warn);
			expect(record.message).to.equal("Warning message");
			expect(record.target).to.equal("warn.module");
			expect(record.metadata?.foo).to.equal("bar");
		});
	});

	describe("Logger", () => {
		describe("NullLogger", () => {
			it("should not log anything", () => {
				const logger = new NullLogger();
				const record = createLogRecord(LogLevel.Info, "Test", "test");

				expect(() => logger.log(record)).never.to.throw();
				expect(logger.isEnabled(LogLevel.Error, "any")).to.equal(false);
			});
		});

		describe("CompositeLogger", () => {
			it("should forward logs to multiple loggers", () => {
				const logs1: LogRecord[] = [];
				const logs2: LogRecord[] = [];

				class TestLogger1 extends BaseLogger {
					log(record: LogRecord): void {
						logs1.push(record);
					}
				}

				class TestLogger2 extends BaseLogger {
					log(record: LogRecord): void {
						logs2.push(record);
					}
				}

				const composite = new CompositeLogger();
				composite.addLogger(new TestLogger1("test1"));
				composite.addLogger(new TestLogger2("test2"));

				const record = createLogRecord(LogLevel.Info, "Test", "test");
				composite.log(record);

				expect(logs1.size()).to.equal(1);
				expect(logs2.size()).to.equal(1);
				expect(logs1[0].message).to.equal("Test");
				expect(logs2[0].message).to.equal("Test");
			});

			it("should check if any logger is enabled", () => {
				class AlwaysEnabledLogger extends BaseLogger {
					isEnabled(level: LogLevel, target: string): boolean {
						return true;
					}
					log(record: LogRecord): void {}
				}

				class NeverEnabledLogger extends BaseLogger {
					isEnabled(level: LogLevel, target: string): boolean {
						return false;
					}
					log(record: LogRecord): void {}
				}

				const composite = new CompositeLogger();
				composite.addLogger(new NeverEnabledLogger("never"));
				composite.addLogger(new AlwaysEnabledLogger("always"));

				expect(composite.isEnabled(LogLevel.Info, "test")).to.equal(true);
			});
		});

		describe("BufferedLogger", () => {
			it("should buffer logs and flush when buffer is full", () => {
				const flushedRecords: LogRecord[][] = [];

				class TestBufferedLogger extends BufferedLogger {
					protected flushRecords(records: LogRecord[]): void {
						flushedRecords.push([...records]);
					}
				}

				const logger = new TestBufferedLogger("buffered", 3);

				// Add 2 records - should not flush yet
				logger.log(createLogRecord(LogLevel.Info, "Message 1", "test"));
				logger.log(createLogRecord(LogLevel.Info, "Message 2", "test"));
				expect(flushedRecords.size()).to.equal(0);

				// Add 3rd record - should trigger flush
				logger.log(createLogRecord(LogLevel.Info, "Message 3", "test"));
				expect(flushedRecords.size()).to.equal(1);
				expect(flushedRecords[0].size()).to.equal(3);
			});

			it("should flush manually", () => {
				const flushedRecords: LogRecord[][] = [];

				class TestBufferedLogger extends BufferedLogger {
					protected flushRecords(records: LogRecord[]): void {
						flushedRecords.push([...records]);
					}
				}

				const logger = new TestBufferedLogger("buffered", 10);

				logger.log(createLogRecord(LogLevel.Info, "Message", "test"));
				expect(flushedRecords.size()).to.equal(0);

				logger.flush();
				expect(flushedRecords.size()).to.equal(1);
				expect(flushedRecords[0].size()).to.equal(1);
			});
		});
	});

	describe("LogManager", () => {
		beforeEach(() => {
			LogManager.resetInstance();
		});

		it("should create singleton instance", () => {
			const manager1 = LogManager.getInstance();
			const manager2 = LogManager.getInstance();
			expect(manager1).to.equal(manager2);
		});

		it("should set and get global log level", () => {
			const manager = LogManager.getInstance();
			manager.setLevel(LogLevel.Warn);
			expect(manager.getLevel()).to.equal(LogLevel.Warn);
		});

		it("should enable and disable logging", () => {
			const manager = LogManager.getInstance();
			expect(manager.isEnabled()).to.equal(true);

			manager.setEnabled(false);
			expect(manager.isEnabled()).to.equal(false);

			manager.setEnabled(true);
			expect(manager.isEnabled()).to.equal(true);
		});

		it("should filter logs by global level", () => {
			const logs: LogRecord[] = [];

			class TestLogger extends BaseLogger {
				log(record: LogRecord): void {
					logs.push(record);
				}
			}

			const manager = LogManager.getInstance();
			manager.addLogger(new TestLogger("test"));
			manager.setLevel(LogLevel.Warn);

			manager.log(createLogRecord(LogLevel.Debug, "Debug", "test"));
			manager.log(createLogRecord(LogLevel.Info, "Info", "test"));
			manager.log(createLogRecord(LogLevel.Warn, "Warn", "test"));
			manager.log(createLogRecord(LogLevel.Error, "Error", "test"));

			expect(logs.size()).to.equal(2);
			expect(logs[0].message).to.equal("Warn");
			expect(logs[1].message).to.equal("Error");
		});

		it("should get named loggers", () => {
			const manager = LogManager.getInstance();
			const logger1 = manager.getLogger("module1");
			const logger2 = manager.getLogger("module2");
			const logger1Again = manager.getLogger("module1");

			expect(logger1.getName()).to.equal("module1");
			expect(logger2.getName()).to.equal("module2");
			expect(logger1).to.equal(logger1Again);
		});

		it("should support logger wrapper methods", () => {
			const logs: LogRecord[] = [];

			class TestLogger extends BaseLogger {
				log(record: LogRecord): void {
					logs.push(record);
				}
			}

			const manager = LogManager.getInstance();
			manager.addLogger(new TestLogger("test"));
			manager.setLevel(LogLevel.Trace);

			const logger = getLogger("test.module");
			logger.trace("Trace message");
			logger.debug("Debug message");
			logger.info("Info message");
			logger.warn("Warn message");
			logger.error("Error message");

			expect(logs.size()).to.equal(5);
			expect(logs[0].level).to.equal(LogLevel.Trace);
			expect(logs[1].level).to.equal(LogLevel.Debug);
			expect(logs[2].level).to.equal(LogLevel.Info);
			expect(logs[3].level).to.equal(LogLevel.Warn);
			expect(logs[4].level).to.equal(LogLevel.Error);
		});
	});
};