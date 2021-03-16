import React from 'react';
import { Container, Divider, Fade, makeStyles } from '@material-ui/core';
import MainAuth from './MainAuth';
import MainConverter from './MainConverter';
import { useAuthContext } from '../Providers/Auth';
import { usePickerContext } from '../Providers/Picker';
import Empty from '../Elements/Empty';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  controls: {
    flex: '0 0 auto',
    display: 'flex',
    height: 'auto',
    minHeight: '30vh',
  },
}));
// className="flex-base w-full h-max flex flex-row"
interface IMain {}

const Main: React.FC<IMain> = ({}) => {
  const classes = useStyles();

  const { isLogin } = useAuthContext();
  const { selected, selectedFile } = usePickerContext();
  return (
    <Container maxWidth="md" className={classes.root}>
      <div
        className={classes.controls}
        style={{ width: isLogin ? '100%' : 'auto' }}
      >
        <MainAuth />
        <Fade in={isLogin} unmountOnExit mountOnEnter>
          <Divider style={{ width: '1px', height: '100%' }} />
        </Fade>
        <div style={{ flex: 1.5, display: 'grid', placeItems: 'center' }}>
          <Fade
            in={isLogin && (!!selected || !!selectedFile)}
            unmountOnExit
            mountOnEnter
          >
            <MainConverter />
          </Fade>
          <Fade
            in={isLogin && !selected && !selectedFile}
            unmountOnExit
            mountOnEnter
          >
            <Empty style={{ gridArea: '1/1', height: '100%', width: '100%' }} />
          </Fade>
        </div>
      </div>
    </Container>
  );
};

export default Main;
