import queryString from 'query-string';
import React from 'react';
import { useLocation } from 'react-router-dom';
import fetch from '../../utils/fetch';

interface IAuthContextProps {
  children: React.ReactChild;
}

interface IAuthContextValue {
  isLogin?: boolean;
  loading?: boolean;
  email?: string | null;
  logout: () => void;
  loginToDrive: () => void;
}

const initialData: IAuthContextValue = {
  loginToDrive: () => null,
  logout: () => null,
};

const AuthContext = React.createContext<IAuthContextValue>(initialData);

const AuthProvider: React.FunctionComponent<IAuthContextProps> = ({
  children,
}) => {
  const [isLogin, setIsLogin] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState<string | null | undefined>(null);
  const loc = useLocation();
  const loginToDrive = async () => {
    setLoading(true);
    const req = await fetch.get<{
      url?: string;
      isLogin?: boolean;
      email?: string;
    }>({
      url: `${import.meta.env.VITE_APP_API}/a/generate`,
    });

    if (req.success && req.data?.url) {
      location.replace(req.data.url);
    } else if (req.data?.isLogin) {
      setIsLogin(true);
      if (req.data.email) setEmail(req.data.email);
    }
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    const res = await fetch.post({
      url: `${import.meta.env.VITE_APP_API}/a/logout`,
    });

    if (res.success) {
      setEmail(null);
      setIsLogin(false);
    }
    setLoading(false);
  };

  const fetchCurrentLogin = async () => {
    setLoading(true);
    const req = await fetch.get<{
      url?: string;
      isLogin?: boolean;
      email?: string;
    }>({
      url: `${import.meta.env.VITE_APP_API}/a/generate`,
    });

    if (req.success && req.data?.email) {
      setEmail(req.data.email);
      setIsLogin(true);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchCurrentLogin();
  }, []);

  React.useEffect(() => {
    const { code } = queryString.parse(loc.search) as {
      code: string;
      scope: string;
    };

    if (code && !isLogin) {
      setLoading(true);
      fetch
        .post<{ id: string; email: string }>({
          url: `${import.meta.env.VITE_APP_API}/a/auth`,
          data: {
            code,
          },
        })
        .then((v) => {
          if (v.success) {
            setIsLogin(true);
            setEmail(v.data?.email);
          }
          setLoading(false);
        });
    }
  }, [loc]);

  return (
    <AuthContext.Provider
      value={{ loginToDrive, isLogin, email, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuthContext = () => {
  const context: IAuthContextValue = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('Context must be used within a AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuthContext };
