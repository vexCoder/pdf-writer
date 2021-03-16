import React, { ChangeEvent } from 'react';
import fetch from '../../utils/fetch';
import { SetStateForce } from '../../utils/types';
import { PickerModal } from '../Picker';

interface IPickerContextProps {
  children: React.ReactChild;
}

interface IPickerContextValue {
  show?: boolean;
  loading?: boolean;
  itemList?: IFileSheet[];
  selected?: IFileSheet | null;
  pageTokens?: (string | null)[];
  pageNum?: number;
  count?: number;
  sizes?: number[];
  selectedFile?: File | null;
  setSelected: SetStateForce<IFileSheet | null>;
  setSelectedFile: SetStateForce<File | null>;
  setShow: SetStateForce<boolean>;
  setLoading: SetStateForce<boolean>;
  setCount: SetStateForce<number>;
  setPageNum: SetStateForce<number>;
  setPageTokens: SetStateForce<(string | null)[]>;
  nextList: () => void;
  prevList: () => void;
  loadFileDialog: () => void;
}

const initialData: IPickerContextValue = {
  setShow: () => null,
  setLoading: () => null,
  setPageNum: () => null,
  setPageTokens: () => null,
  setSelected: () => null,
  setSelectedFile: () => null,
  setCount: () => null,
  nextList: () => null,
  prevList: () => null,
  loadFileDialog: () => null,
};

export interface IFileSheet {
  createdTime: string;
  id: string;
  modifiedTime: string;
  thumbnailLink: string;
  name: string;
}

const PickerContext = React.createContext<IPickerContextValue>(initialData);

const PickerProvider: React.FunctionComponent<IPickerContextProps> = ({
  children,
}) => {
  const [show, setShow] = React.useState(false);
  const [itemList, setItemList] = React.useState<IFileSheet[]>([]);
  const [pageTokens, setPageTokens] = React.useState<(string | null)[]>([null]);
  const [pageNum, setPageNum] = React.useState(0);
  const [count, setCount] = React.useState(5);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<IFileSheet | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const sizes = [3, 5, 10, 20];

  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (show) {
      loadItems(pageTokens[pageNum]);
    }
  }, [show, pageNum, pageTokens, count]);

  const loadItems = async (token?: string | null) => {
    setLoading(true);
    if (pageTokens[pageNum] || pageTokens.length === 1 || pageNum === 0) {
      const res = await fetch.post<{
        files: IFileSheet[];
        nextPage: string;
      }>({
        url: `${import.meta.env.VITE_APP_API}/f/list`,
        data: {
          currentPage: token,
          count,
        },
      });

      setItemList(res.data?.files || []);
      if (pageNum + 1 >= pageTokens.length && res?.data?.nextPage) {
        const nToken = res?.data?.nextPage;
        setPageTokens((prev) => [...prev, nToken]);
      }
    }
    setLoading(false);
  };

  const loadFileDialog = () => {
    if (fileRef.current) {
      if (fileRef.current) {
        fileRef.current.value = '';
      }
      fileRef.current.click();
    }
  };

  const nextList = () => {
    setPageNum((prev) => (prev < pageTokens.length - 1 ? prev + 1 : prev));
  };

  const prevList = () => {
    setPageNum((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files) {
      const file = (files[0] as unknown) as File;
      setSelectedFile(file);
      setSelected(null);
    }
  };

  console.log(selectedFile);
  return (
    <PickerContext.Provider
      value={{
        itemList,
        pageTokens,
        pageNum,
        show,
        count,
        loading,
        sizes,
        selected,
        selectedFile,
        setShow,
        nextList,
        prevList,
        setCount,
        setLoading,
        setPageNum,
        setPageTokens,
        setSelected,
        loadFileDialog,
        setSelectedFile,
      }}
    >
      <PickerModal show={show} handleClose={() => setShow(false)} />
      <input
        style={{ visibility: 'hidden', position: 'absolute' }}
        type="file"
        ref={fileRef}
        onChange={handleChange}
      />
      {children}
    </PickerContext.Provider>
  );
};

const usePickerContext = () => {
  const context: IPickerContextValue = React.useContext(PickerContext);
  if (context === undefined) {
    throw new Error('Context must be used within a PickerProvider');
  }
  return context;
};

export { PickerProvider, usePickerContext };
