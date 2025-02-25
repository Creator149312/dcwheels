const ListDisplayPage = ({ listData }) => {
    return (
      <div className="space-y-6 px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">{listData.title}</h1>
        <p className="text-lg text-center text-gray-600 mb-6">{listData.description}</p>
        <div className="space-y-6">
          {listData.words.map((item, index) => (
            <div
              key={index}
              className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 transition-all duration-300"
            >
              {/* Numbering */}
              <span className="text-xl font-semibold text-gray-700 mr-4">{index + 1}.</span>
  
              {/* Word on the left */}
              <h3 className="text-xl font-semibold text-gray-800 w-1/3">{item.word}</h3>
  
              {/* WordData (image or text) on the right */}
              <div className="flex-1">
                {item.wordData.includes('data:image') ? (
                  <img
                    src={item.wordData}
                    alt={item.word}
                    className="w-32 h-32 object-cover rounded-md shadow-sm transition-all duration-300 hover:scale-105"
                  />
                ) : (
                  <p className="text-lg text-gray-700">{item.wordData}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default ListDisplayPage;
  