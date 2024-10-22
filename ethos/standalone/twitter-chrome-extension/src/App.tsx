import { useEffect, useState } from 'react';
import './App.css';
// import TestArea from './components/TestArea';
import { StorageKeys } from './content/definitions/storage-definitions';
import { storageService } from './content/service/database-service';

function App() {
  const [showTestArea] = useState(false);
  const [scoreBorders, setScoreBorders] = useState<boolean | undefined>(undefined);
  const [scoreLabels, setScoreLabels] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const initializeSettings = async () => {
      let borders = await storageService.getData(StorageKeys.ShowCredibilityScoreBorders);
      let labels = await storageService.getData(StorageKeys.ShowCredibilityScoreLabels);

      // Check if the values are uninitialized and set to true if they are undefined
      if (borders === undefined) {
        borders = true;
        await storageService.setData(StorageKeys.ShowCredibilityScoreBorders, true);
      }
      if (labels === undefined) {
        labels = true;
        await storageService.setData(StorageKeys.ShowCredibilityScoreLabels, true);
      }

      setScoreBorders(borders);
      setScoreLabels(labels);
    };

    initializeSettings();
  }, []);

  const handleToggleScoreBorders = async () => {
    if (scoreBorders !== undefined) {
      const newValue = !scoreBorders;
      setScoreBorders(newValue);
      await storageService.setData(StorageKeys.ShowCredibilityScoreBorders, newValue);
    }
  };

  const handleToggleScoreLabels = async () => {
    if (scoreLabels !== undefined) {
      const newValue = !scoreLabels;
      setScoreLabels(newValue);
      await storageService.setData(StorageKeys.ShowCredibilityScoreLabels, newValue);
    }
  };

  // Listen for changes and log only the new values
  storageService.listenData((newValues, areaName) => {
    if (areaName === 'local') {
      // Ensure the change is in the local storage area
      if (newValues[StorageKeys.ShowCredibilityScoreBorders] !== undefined) {
        console.log(
          'ShowCredibilityScoreBorders changed to:',
          newValues[StorageKeys.ShowCredibilityScoreBorders],
        );
      }
      if (newValues[StorageKeys.ShowCredibilityScoreLabels] !== undefined) {
        console.log(
          'ShowCredibilityScoreLabels changed to:',
          newValues[StorageKeys.ShowCredibilityScoreLabels],
        );
      }
    }
  });

  return (
    <div>
      {showTestArea ? (
        <div>{/* <TestArea /> */}</div>
      ) : (
        <div>
          <div className="popup-header">
            <img
              src="https://i.ibb.co/87z2z6J/Group-513705.png"
              alt="Ethos Logo"
              className="popup-logo"
            />
            <span className="extension-name">Ethos Chrome Extension</span>
          </div>

          <div className="popup-body">
            <p>
              The Ethos chrome extension surfaces credibility scores in various websites like
              Twitter. Use this config to modify the display of those scores.
            </p>
            <p className="checkbox-label">Credibility Score Borders</p>
            <div className="checkbox-container">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={scoreBorders}
                  onChange={handleToggleScoreBorders}
                  disabled={scoreBorders === undefined}
                />
                <span className="slider round" />
              </label>
            </div>

            <p className="checkbox-label">Credibility Score Labels</p>
            <div className="checkbox-container">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={scoreLabels}
                  onChange={handleToggleScoreLabels}
                  disabled={scoreLabels === undefined}
                />
                <span className="slider round" />
              </label>
            </div>
          </div>
          <div className="popup-footer">
            <a
              href="https://www.ethos.network/"
              className="learn-more-link"
              target="_blank"
              rel="noreferrer"
            >
              Learn more about Ethos
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
