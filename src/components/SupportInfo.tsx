import React, { useState, useEffect } from 'react';
import { DeviceFamily, type AtPackDevice } from '../types/atpack';
import { useAtPackStore } from '../stores/atpackStore';

interface SupportInfoProps {
  device: AtPackDevice;
}

export const SupportInfo: React.FC<SupportInfoProps> = ({ device }) => {
  const [supportHtml, setSupportHtml] = useState<string>('');
  const [includeFiles, setIncludeFiles] = useState<string[]>([]);
  const [dataFiles, setDataFiles] = useState<string[]>([]);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'compiler' | 'include' | 'data'>('compiler');
  const { selectedAtPack } = useAtPackStore();

  useEffect(() => {
    const loadSupportInfo = async () => {
      if (!device || device.deviceFamily !== DeviceFamily.PIC || !selectedAtPack) {
        setSupportHtml('');
        setIncludeFiles([]);
        setDataFiles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const deviceName = device.name.toLowerCase();
        const cleanDeviceName = deviceName.startsWith('pic') ? deviceName.substring(3) : deviceName;
        const zipContent = selectedAtPack.zipContent;
        
        if (!zipContent) {
          throw new Error('AtPack ZIP content not available');
        }

        // Load compiler documentation (HTML)
        const supportFileName = `xc8/docs/chips/${cleanDeviceName}.html`;
        const htmlFile = zipContent.files[supportFileName];
        if (htmlFile) {
          const htmlContent = await htmlFile.async('text');
          setSupportHtml(htmlContent);
        } else {
          setSupportHtml('');
        }

        // Load include files (.h files)
        const allFiles = Object.keys(zipContent.files);
        const includeFilePaths = allFiles.filter(path => 
          path.toLowerCase().includes(cleanDeviceName) && 
          path.endsWith('.h') &&
          (path.includes('xc8/') || path.includes('include/'))
        );
        setIncludeFiles(includeFilePaths);

        // Load data files (.inc, .def, etc.)
        const dataFilePaths = allFiles.filter(path => 
          path.toLowerCase().includes(cleanDeviceName) && 
          (path.endsWith('.inc') || path.endsWith('.def') || path.endsWith('.cfg')) &&
          path.includes('xc8/')
        );
        setDataFiles(dataFilePaths);
        
      } catch (err) {
        console.error('Error loading support info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadSupportInfo();
  }, [device, selectedAtPack]);

  const loadFileContent = async (filePath: string) => {
    if (!selectedAtPack?.zipContent) return;
    
    try {
      const file = selectedAtPack.zipContent.files[filePath];
      if (file) {
        const content = await file.async('text');
        setSelectedFileContent(content);
        setSelectedFileName(filePath);
      }
    } catch (err) {
      console.error('Error loading file content:', err);
      setSelectedFileContent(`Error loading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSelectedFileName(filePath);
    }
  };

  const handleSubTabChange = (tab: 'compiler' | 'include' | 'data') => {
    setActiveSubTab(tab);
    setSelectedFileContent('');
    setSelectedFileName('');
  };

  if (device?.deviceFamily !== DeviceFamily.PIC) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>📄 Support information is currently available only for PIC devices.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading support information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
        <p>❌ Error loading support information: {error}</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Support documentation may not be available for this device.
        </p>
      </div>
    );
  }

  if (!supportHtml && includeFiles.length === 0 && dataFiles.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>📄 No support information available for this device.</p>
      </div>
    );
  }

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'compiler':
        return supportHtml ? (
          <div 
            className="support-info-content"
            dangerouslySetInnerHTML={{ __html: supportHtml }}
            style={{ fontFamily: 'inherit', lineHeight: '1.5' }}
          />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <p>No compiler documentation available for this device.</p>
          </div>
        );
      
      case 'include':
        return includeFiles.length > 0 ? (
          <div style={{ padding: '10px', display: 'flex', height: '100%' }}>
            <div style={{ width: '40%', paddingRight: '10px', borderRight: '1px solid #ddd' }}>
              <h3>Include Files (.h)</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {includeFiles.map((file, index) => (
                  <li key={index} style={{ 
                    padding: '8px 12px', 
                    margin: '2px 0', 
                    backgroundColor: selectedFileName === file ? '#007acc' : (index % 2 === 0 ? '#f9f9f9' : 'white'),
                    color: selectedFileName === file ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => loadFileContent(file)}
                  onMouseEnter={(e) => {
                    if (selectedFileName !== file) {
                      e.currentTarget.style.backgroundColor = '#e6f3ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFileName !== file) {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
                    }
                  }}
                  >
                    📄 {file.split('/').pop()}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ width: '60%', paddingLeft: '10px' }}>
              {selectedFileName && selectedFileContent ? (
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#007acc' }}>{selectedFileName}</h4>
                  <pre style={{ 
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    padding: '10px',
                    fontSize: '12px',
                    fontFamily: 'Courier New, monospace',
                    overflow: 'auto',
                    maxHeight: '600px',
                    margin: 0
                  }}>
                    {selectedFileContent}
                  </pre>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '200px', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Click on a file to view its content
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <p>No include files found for this device.</p>
          </div>
        );
      
      case 'data':
        return dataFiles.length > 0 ? (
          <div style={{ padding: '10px', display: 'flex', height: '100%' }}>
            <div style={{ width: '40%', paddingRight: '10px', borderRight: '1px solid #ddd' }}>
              <h3>Data Files (.inc, .def, .cfg)</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {dataFiles.map((file, index) => (
                  <li key={index} style={{ 
                    padding: '8px 12px', 
                    margin: '2px 0', 
                    backgroundColor: selectedFileName === file ? '#007acc' : (index % 2 === 0 ? '#f9f9f9' : 'white'),
                    color: selectedFileName === file ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => loadFileContent(file)}
                  onMouseEnter={(e) => {
                    if (selectedFileName !== file) {
                      e.currentTarget.style.backgroundColor = '#e6f3ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFileName !== file) {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
                    }
                  }}
                  >
                    📊 {file.split('/').pop()}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ width: '60%', paddingLeft: '10px' }}>
              {selectedFileName && selectedFileContent ? (
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#007acc' }}>{selectedFileName}</h4>
                  <pre style={{ 
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    padding: '10px',
                    fontSize: '12px',
                    fontFamily: 'Courier New, monospace',
                    overflow: 'auto',
                    maxHeight: '600px',
                    margin: 0
                  }}>
                    {selectedFileContent}
                  </pre>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '200px', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Click on a file to view its content
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <p>No data files found for this device.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '0', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>
        {`
          .support-info-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 10px 0;
          }
          
          .support-info-content th,
          .support-info-content td {
            padding: 8px 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          
          .support-info-content th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
          }
          
          .support-info-content tr:nth-child(even) {
            background-color: #f9f9f9 !important;
          }
          
          .support-info-content code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          
          .support-info-content h2,
          .support-info-content h3 {
            color: #007acc;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          
          .support-info-content h2 {
            font-size: 1.5em;
            border-bottom: 2px solid #007acc;
            padding-bottom: 5px;
          }
          
          .support-info-content h3 {
            font-size: 1.2em;
          }
          
          .support-info-content table[bgcolor="lightgray"] {
            background-color: #f5f5f5 !important;
          }
          
          .support-info-content tr[bgcolor="white"] {
            background-color: white !important;
          }
          
          .support-info-content tt {
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          
          .support-info-content b {
            font-weight: bold;
          }
        `}
      </style>
      
      {/* Sub-tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f8f9fa',
        flexShrink: 0
      }}>
        <button
          onClick={() => handleSubTabChange('compiler')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeSubTab === 'compiler' ? '2px solid #007acc' : '2px solid transparent',
            background: 'none',
            color: activeSubTab === 'compiler' ? '#007acc' : '#666',
            fontWeight: activeSubTab === 'compiler' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          📖 Compiler Docs
        </button>
        <button
          onClick={() => handleSubTabChange('include')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeSubTab === 'include' ? '2px solid #007acc' : '2px solid transparent',
            background: 'none',
            color: activeSubTab === 'include' ? '#007acc' : '#666',
            fontWeight: activeSubTab === 'include' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          📄 Include ({includeFiles.length})
        </button>
        <button
          onClick={() => handleSubTabChange('data')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeSubTab === 'data' ? '2px solid #007acc' : '2px solid transparent',
            background: 'none',
            color: activeSubTab === 'data' ? '#007acc' : '#666',
            fontWeight: activeSubTab === 'data' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          📊 Data ({dataFiles.length})
        </button>
      </div>
      
      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderSubTabContent()}
      </div>
    </div>
  );
};
