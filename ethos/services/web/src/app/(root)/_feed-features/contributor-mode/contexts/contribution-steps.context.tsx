import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useState,
} from 'react';

export const ContributionStepsContext = createContext<{
  stepDetails: {
    bundleIndex: number;
    chainedItemIndex: number;
  };
  setStepDetails: Dispatch<
    SetStateAction<{
      bundleIndex: number;
      chainedItemIndex: number;
    }>
  >;
}>({
  stepDetails: {
    bundleIndex: 0,
    chainedItemIndex: 0,
  },
  setStepDetails: () => {},
});

export function ContributionStepsProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<{ bundleIndex: number; chainedItemIndex: number }>({
    bundleIndex: 0,
    chainedItemIndex: 0,
  });

  return (
    <ContributionStepsContext.Provider
      value={{
        stepDetails: {
          bundleIndex: state.bundleIndex,
          chainedItemIndex: state.chainedItemIndex,
        },
        setStepDetails: setState,
      }}
    >
      {children}
    </ContributionStepsContext.Provider>
  );
}

export function useContributionSteps() {
  const context = useContext(ContributionStepsContext);

  if (!context) {
    throw new Error('useContributionSteps must be used within a ContributionStepsProvider');
  }

  return context;
}
