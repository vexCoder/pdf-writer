import React from 'react';
import {
  Backdrop,
  Grow,
  makeStyles,
  Modal as MuiModal,
  Paper,
} from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  root: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    outline: 0,
  },
  paper: {
    position: 'relative',
    borderRadius: theme.spacing(1),
    overflow: 'hidden',
    width: 'auto',
    outline: 0,
  },
}));

interface ModalProps {
  in: boolean;
  handleClose: () => void;
  handleExitTransition?: () => void;
  disableBackdropClick?: boolean;
  keepMounted?: boolean;
  unmountOnExit?: boolean;
  mountOnEnter?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  in: inProps = false,
  handleClose,
  handleExitTransition,
  disableBackdropClick = false,
  keepMounted = true,
}) => {
  const classes = useStyles();
  return (
    <MuiModal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      className={classes.root}
      open={inProps}
      onClose={handleClose}
      keepMounted={keepMounted}
      BackdropComponent={Backdrop}
      BackdropProps={{
        style: {
          minHeight: '800px',
          overflowY: 'auto',
        },
        timeout: 500,
      }}
      disableBackdropClick={disableBackdropClick}
    >
      <Grow in={inProps} onExited={handleExitTransition}>
        <div style={{ outline: 0 }}>{children}</div>
      </Grow>
    </MuiModal>
  );
};
