import FileUpload from "./file-upload";

interface ChatFileProps {}

const ChatFile = ({}: ChatFileProps) => {
  return (
    <div className="relative flex-1 w-full h-full flex justify-center items-center">
      <FileUpload />
    </div>
  );
};

export default ChatFile;
