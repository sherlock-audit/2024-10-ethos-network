import { type TargetContract } from '@ethos/contracts';
import { type ReplySummary } from '@ethos/domain';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { CommentsDrawer } from 'components/activity-cards/comments/drawer.component';

type CommentsDrawerContextType = {
  openDrawer: (
    targetId: number,
    targetContract: TargetContract,
    replySummary: ReplySummary,
  ) => void;
  closeDrawer: () => void;
};

const CommentsDrawerContext = createContext<CommentsDrawerContextType | undefined>(undefined);

export function CommentsDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [targetContract, setTargetContract] = useState<TargetContract | null>(null);
  const [replySummary, setReplySummary] = useState<ReplySummary | null>(null);

  function openDrawer(id: number, contract: TargetContract, summary: ReplySummary) {
    setTargetId(id);
    setTargetContract(contract);
    setReplySummary(summary);
    setIsOpen(true);
  }

  function closeDrawer() {
    setIsOpen(false);
  }

  return (
    <CommentsDrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
      {targetId !== null && targetContract !== null && replySummary !== null && (
        <CommentsDrawer
          target={{ contract: targetContract, id: targetId }}
          isOpen={isOpen}
          close={closeDrawer}
          commentCount={replySummary.count}
        />
      )}
    </CommentsDrawerContext.Provider>
  );
}

export function useCommentsDrawer() {
  const context = useContext(CommentsDrawerContext);

  if (!context) {
    throw new Error('useCommentsDrawer must be used within a CommentsDrawerProvider');
  }

  return context;
}
