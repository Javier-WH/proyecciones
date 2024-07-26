import { createContext, ReactNode} from "react"

export const MainContext = createContext<object | undefined>(undefined);

export const MainContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const values = {

  }


  return (
    <MainContext.Provider value={values}>
      {children}
    </MainContext.Provider>
  );
}


