import { DEFAULT_STARTING_SCORE } from '@ethos/score';
import { BehaviorSubject } from 'rxjs';
import { dataFetchingService } from '../service/data-fetching-service.ts';

export class CredibilityScorePoolingHelper {
  private static instance: CredibilityScorePoolingHelper;
  private readonly handleIdScoreSubject: BehaviorSubject<Map<string, number>>;
  private readonly fetchingMap: Map<string, Promise<number>>;

  private constructor() {
    this.handleIdScoreSubject = new BehaviorSubject<Map<string, number>>(new Map());
    this.fetchingMap = new Map();
  }

  public static getInstance(): CredibilityScorePoolingHelper {
    if (!CredibilityScorePoolingHelper.instance) {
      CredibilityScorePoolingHelper.instance = new CredibilityScorePoolingHelper();
    }

    return CredibilityScorePoolingHelper.instance;
  }

  public async fetchValue(handleId: string): Promise<number> {
    const currentData = this.handleIdScoreSubject.getValue();

    if (currentData.has(handleId)) {
      return currentData.get(handleId)!;
    }

    if (!this.fetchingMap.has(handleId)) {
      const fetchPromise = dataFetchingService
        .fetchCredibilityScoreFromXHandler(handleId)
        .then((response) => {
          const score = response.score ?? DEFAULT_STARTING_SCORE;
          this.updateScore(handleId, score);

          return score;
        })
        .catch((error) => {
          console.error(`Error fetching credibility score for ${handleId}:`, error);
          throw error;
        });

      this.fetchingMap.set(handleId, fetchPromise);
    }

    return await this.fetchingMap.get(handleId)!;
  }

  private updateScore(handleId: string, score: number): void {
    const currentData = this.handleIdScoreSubject.getValue();
    this.fetchingMap.delete(handleId);
    currentData.set(handleId, score);
    this.handleIdScoreSubject.next(currentData);
  }

  public getHandleIdScoreObservable() {
    return this.handleIdScoreSubject.asObservable();
  }

  public listen(callback: (handleIdScoreMap: Map<string, number>) => void) {
    this.getHandleIdScoreObservable().subscribe(callback);
  }
}
