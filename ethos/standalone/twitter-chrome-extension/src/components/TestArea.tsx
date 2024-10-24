import { useState } from 'react';
import { StorageKeys } from '../content/definitions/storage-definitions.ts';
import { dataFetchingService } from '../content/service/data-fetching-service.ts';
import { storageService } from '../content/service/database-service.ts';

const TestArea: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  const testFunctionFetchCredibilityScoreFromEthAddress = async () => {
    addLog('Test Function FetchCredibilityScoreFromEthAddress executed');
    try {
      const response = await dataFetchingService.fetchCredibilityScoreFromEthAddress(
        '0x69Eb51FC5d96E795F6f58A58D0CAe0b44c964168',
      );
      addLog(`🚀 Response score: ${response.score?.toString()}`);
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`);
    }
  };

  const testFunctionFetchCredibilityScoreFromXHandler = async () => {
    addLog('Test Function FetchCredibilityScoreFromHandleId executed');
    try {
      const response = await dataFetchingService.fetchCredibilityScoreFromXHandler('Youclidean');
      addLog(`Response: ${JSON.stringify(response)}`);
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`);
    }
  };

  const testFunctionFetchReviewDetailsByEthAddress = async () => {
    addLog('Test Function FetchReviewDetailsByEthAddress executed');
    try {
      const response = await dataFetchingService.fetchReviewDetailsByEthAddress(
        '0x69Eb51FC5d96E795F6f58A58D0CAe0b44c964168',
      );
      addLog(`Response: ${JSON.stringify(response)}`);
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`);
    }
  };

  const testFunctionFetchReviewDetailsByEthHandle = async () => {
    addLog('Test Function FetchReviewDetailsByEthHandle executed');
    try {
      const response = await dataFetchingService.fetchReviewDetailsByXHandle('ethHandle_example');
      addLog(`Response: ${JSON.stringify(response)}`);
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`);
    }
  };

  const testFunctionFetchVouchDetailsByEthAddress = async () => {
    addLog('Test Function FetchVouchDetails executed');
    try {
      const response = await dataFetchingService.fetchVouchDetailsByEthAddress(
        '0xE1e6444E7A78B2689a3EF8fA2Ff4EA1Fe8dfC710',
      );
      addLog(`Response: ${JSON.stringify(response)}`);
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`);
    }
  };
  const testFunctionFetchVouchDetailsByXHandle = async () => {
    addLog('Test Function FetchVouchDetails executed');
    try {
      const response = await dataFetchingService.fetchVouchDetailsByXHandle('example');
      addLog(`Response: ${JSON.stringify(response)}`);
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`);
    }
  };

  const testFunctionToggleStorageValues = async () => {
    addLog('Test Function ToggleStorageValues executed');
    try {
      const showBorders: boolean | undefined = await storageService.getData(
        StorageKeys.ShowCredibilityScoreBorders,
      );
      const showLabels: boolean | undefined = await storageService.getData(
        StorageKeys.ShowCredibilityScoreLabels,
      );

      await storageService.setData(StorageKeys.ShowCredibilityScoreBorders, !showBorders);
      await storageService.setData(StorageKeys.ShowCredibilityScoreLabels, !showLabels);
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`);
    }
  };

  const testFunctionLogStorageValues = async () => {
    addLog('Test Function LogStorageValues executed');
    try {
      const showBorders: boolean | undefined = await storageService.getData(
        StorageKeys.ShowCredibilityScoreBorders,
      );
      const showLabels: boolean | undefined = await storageService.getData(
        StorageKeys.ShowCredibilityScoreLabels,
      );

      addLog('Show Credibility Score Borders:' + showBorders);
      addLog('Show Credibility Score Labels:' + showLabels);
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="test-area mt-4 p-4">
      <h3 className="text-2xl font-bold mb-4">Test Area</h3>
      <div className="button-grid grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={testFunctionFetchCredibilityScoreFromEthAddress}
          className="bg-gray-300 text-black py-3 px-5 rounded hover:bg-gray-400"
        >
          Fetch Credibility Score from ETH Address yooo
        </button>
        <button
          onClick={testFunctionFetchCredibilityScoreFromXHandler}
          className="bg-gray-300 text-black py-3 px-5 rounded hover:bg-gray-400"
        >
          Fetch Credibility Score from Handle ID
        </button>
        <button
          onClick={testFunctionFetchReviewDetailsByEthAddress}
          className="bg-gray-300 text-black py-3 px-5 rounded hover:bg-gray-400"
        >
          Fetch Review Details by ETH Address
        </button>
        <button
          onClick={testFunctionFetchReviewDetailsByEthHandle}
          className="bg-gray-300 text-black py-3 px-5 rounded hover:bg-gray-400"
        >
          Fetch Review Details by ETH Handle
        </button>
        <button
          onClick={testFunctionFetchVouchDetailsByEthAddress}
          className="bg-gray-300 text-black py-3 px-5 rounded hover:bg-gray-400"
        >
          Fetch Vouch Details by Eth address
        </button>
        <button
          onClick={testFunctionFetchVouchDetailsByXHandle}
          className="bg-gray-300 text-black py-3 px-5 rounded hover:bg-gray-400"
        >
          Fetch Vouch Details By X Handle
        </button>
        <button
          onClick={testFunctionToggleStorageValues}
          className="bg-gray-300 text-black py-3 px-5 rounded hover:bg-gray-400"
        >
          Toggle Storage Values
        </button>
        <button
          onClick={testFunctionLogStorageValues}
          className="bg-gray-300 text-black py-3 px-5 rounded hover:bg-gray-400"
        >
          Log Storage Values
        </button>
      </div>
      <div
        className="log-viewer mt-4 bg-gray-800 text-gray-300 p-4 rounded"
        style={{
          height: '200px',
          overflowY: 'scroll',
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          border: '1px solid #333',
        }}
      >
        {logs.map((log, index) => (
          <div
            key={index}
            style={{ borderBottom: '1px dashed #333', padding: '4px 0', color: 'black' }}
          >
            {log}
          </div>
        ))}
      </div>
      <button
        onClick={clearLogs}
        className="mt-4 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
      >
        Clear Logs
      </button>
    </div>
  );
};

export default TestArea;
