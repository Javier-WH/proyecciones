import { List } from 'antd';
import { Modal } from 'antd';


const ShowArrayModal: React.FC<{ arrayList: string[], isModalOpen: boolean, setIsModalOpen: (open: boolean) => void, title: string }> = ({ arrayList, isModalOpen, setIsModalOpen, title }) => {


  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Modal title={title} open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
        <div style={
          {
            maxHeight: '400px',
            overflowY: 'auto',
          }
        }>
          <List
            size="small"
            bordered
            dataSource={arrayList}
            renderItem={(item) => (
              <List.Item>
                {item}
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </>
  );
};

export default ShowArrayModal;