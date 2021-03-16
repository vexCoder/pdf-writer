import React from 'react';
import { Route, BrowserRouter, Switch } from 'react-router-dom';
import { makeStyles } from '@material-ui/core';
import { Main } from './components/Main';
import { AuthProvider } from './components/Providers/Auth';
import { PickerProvider } from './components/Providers/Picker';
import { ConverterProvider } from './components/Providers/Converter';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
  },
}));

interface AppProps {}

const App: React.FC<AppProps> = ({}) => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <BrowserRouter>
        <ConverterProvider>
          <PickerProvider>
            <AuthProvider>
              <Switch>
                <Route exact path="/">
                  <Main />
                </Route>
              </Switch>
            </AuthProvider>
          </PickerProvider>
        </ConverterProvider>
      </BrowserRouter>
    </div>
  );
};

export default App;
