import { describe, it, expect, vi, beforeEach } from "vitest";
import transactionManager, {
  TransactionStatus,
} from "../../../src/bridge/enhanced/sync/TransactionManager";

describe("TransactionManager", () => {
  beforeEach(() => {
    // Alle Transaktionen zurücksetzen für Tests
    const activeTransactions = transactionManager["transactions"];
    activeTransactions.clear();
    transactionManager["stateTransactions"].clear();
    transactionManager["childTransactions"].clear();
    transactionManager["debouncedCommits"].clear();
  });

  it("should create a new transaction", () => {
    // Act
    const txId = transactionManager.beginTransaction({
      name: "Test Transaction",
    });

    // Assert
    expect(txId).toBeTruthy();
    expect(txId).toContain("tx-");

    const txInfo = transactionManager.getTransactionInfo(txId);
    expect(txInfo).toBeTruthy();
    expect(txInfo?.name).toBe("Test Transaction");
    expect(txInfo?.status).toBe(TransactionStatus.PENDING);
  });

  it("should capture snapshots for state changes", () => {
    // Arrange
    const txId = transactionManager.beginTransaction();
    const statePath = ["user", "profile", "name"];
    const currentValue = "John Doe";

    // Act
    transactionManager.captureSnapshot(txId, statePath, currentValue);

    // Assert
    const txInfo = transactionManager.getTransactionInfo(txId);
    expect(txInfo?.snapshotCount).toBe(1);
    expect(txInfo?.changesPending).toBe(true);

    // Verify that the path is tracked
    const pathStr = transactionManager["pathToString"](statePath);
    expect(transactionManager["stateTransactions"].has(pathStr)).toBe(true);
    expect(
      transactionManager["stateTransactions"].get(pathStr)?.has(txId),
    ).toBe(true);
  });

  it("should check if a path is in an active transaction", () => {
    // Arrange
    const txId = transactionManager.beginTransaction();
    const statePath = ["user", "profile", "name"];
    transactionManager.captureSnapshot(txId, statePath, "John Doe");

    // Act
    const isActive = transactionManager.isPathInActiveTransaction(statePath);
    const isActiveExcluded = transactionManager.isPathInActiveTransaction(
      statePath,
      [txId],
    );

    // Assert
    expect(isActive).toBe(true);
    expect(isActiveExcluded).toBe(false);
  });

  it("should commit a transaction successfully", async () => {
    // Arrange
    const txId = transactionManager.beginTransaction();
    const statePath = ["user", "profile", "name"];
    transactionManager.captureSnapshot(txId, statePath, "John Doe");

    // Listener für Änderungen
    const listener = vi.fn();
    const unsubscribe = transactionManager.addChangeListener(listener);

    // Act
    transactionManager.commitTransaction(txId);

    // Assert
    const txInfo = transactionManager.getTransactionInfo(txId);
    expect(txInfo?.status).toBe(TransactionStatus.COMMITTED);
    expect(txInfo?.endTime).toBeDefined();

    // Verify listener was called
    expect(listener).toHaveBeenCalledWith(txId, TransactionStatus.COMMITTED);

    // Verify path is no longer tracked
    const pathStr = transactionManager["pathToString"](statePath);
    expect(transactionManager["stateTransactions"].has(pathStr)).toBe(false);

    // Clean up
    unsubscribe();
  });

  it("should roll back a transaction successfully", () => {
    // Arrange
    const txId = transactionManager.beginTransaction();
    const statePath1 = ["user", "profile", "name"];
    const statePath2 = ["user", "profile", "email"];
    transactionManager.captureSnapshot(txId, statePath1, "John Doe");
    transactionManager.captureSnapshot(txId, statePath2, "john@example.com");

    // Act
    const rollbackValues = transactionManager.rollbackTransaction(txId);

    // Assert
    const txInfo = transactionManager.getTransactionInfo(txId);
    expect(txInfo?.status).toBe(TransactionStatus.ROLLED_BACK);

    // Verify rollback values
    expect(Object.keys(rollbackValues).length).toBe(2);
    expect(rollbackValues["user.profile.name"].value).toBe("John Doe");
    expect(rollbackValues["user.profile.email"].value).toBe("john@example.com");

    // Verify paths are no longer tracked
    expect(transactionManager["stateTransactions"].size).toBe(0);
  });

  it("should handle nested transactions", () => {
    // Arrange
    const parentTxId = transactionManager.beginTransaction({
      name: "Parent Transaction",
    });

    const childTxId = transactionManager.beginTransaction({
      name: "Child Transaction",
      parentTransactionId: parentTxId,
    });

    // Act
    transactionManager.captureSnapshot(childTxId, ["child", "value"], 123);
    transactionManager.commitTransaction(parentTxId); // Should commit child first

    // Assert
    const parentTxInfo = transactionManager.getTransactionInfo(parentTxId);
    const childTxInfo = transactionManager.getTransactionInfo(childTxId);

    expect(parentTxInfo?.status).toBe(TransactionStatus.COMMITTED);
    expect(childTxInfo?.status).toBe(TransactionStatus.COMMITTED);
  });

  it("should handle transaction conflicts", () => {
    // Arrange
    const tx1Id = transactionManager.beginTransaction();
    const tx2Id = transactionManager.beginTransaction();
    const sharedPath = ["shared", "resource"];

    // Act
    transactionManager.captureSnapshot(tx1Id, sharedPath, "value1");

    // Assert
    const isPathActive =
      transactionManager.isPathInActiveTransaction(sharedPath);
    expect(isPathActive).toBe(true);

    // Verify we can check if path is in a transaction excluding tx1
    const isPathActiveExcludingTx1 =
      transactionManager.isPathInActiveTransaction(sharedPath, [tx1Id]);
    expect(isPathActiveExcludingTx1).toBe(false);
  });

  it("should clean up expired transactions", () => {
    // Arrange
    const txId = transactionManager.beginTransaction();
    transactionManager.captureSnapshot(txId, ["test"], "value");
    transactionManager.commitTransaction(txId);

    // Manually set the end time to make it expired
    const tx = transactionManager["transactions"].get(txId)!;
    tx.endTime = Date.now() - 10000; // 10 seconds ago

    // Act
    transactionManager.cleanupTransactions(5000); // 5 seconds max age

    // Assert
    expect(transactionManager.getTransactionInfo(txId)).toBeNull();
  });

  it("should not clean up active transactions", () => {
    // Arrange
    const txId = transactionManager.beginTransaction();
    transactionManager.captureSnapshot(txId, ["test"], "value");

    // Act
    transactionManager.cleanupTransactions(0); // Even with 0 max age

    // Assert
    expect(transactionManager.getTransactionInfo(txId)).not.toBeNull();
  });

  it("should auto-commit a transaction after changes", async () => {
    vi.useFakeTimers();

    // Arrange
    const txId = transactionManager.beginTransaction({
      autoCommit: true,
      autoCommitDelay: 50,
    });

    transactionManager.captureSnapshot(txId, ["test"], "value");

    // Act
    await vi.advanceTimersByTimeAsync(100);

    // Assert
    const txInfo = transactionManager.getTransactionInfo(txId);
    expect(txInfo?.status).toBe(TransactionStatus.COMMITTED);

    vi.useRealTimers();
  });
});
