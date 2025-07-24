import React, { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/dist/bpmn-modeler.development.js';
import axios from 'axios';
import { FileText, Download, Upload, Loader2, AlertCircle, CheckCircle, RefreshCw, Paperclip, Mail } from 'lucide-react';

// Asumiendo que los estilos de bpmn-js están importados en tu archivo principal, ej:
// import 'bpmn-js/dist/assets/diagram-js.css';
// import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

const BpmnEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bpmnModeler, setBpmnModeler] = useState<any>(null);
  const [prompt, setPrompt] = useState('');
  const [email, setEmail] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [currentXml, setCurrentXml] = useState('');
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Diagrama BPMN por defecto para inicializar el editor
  const defaultBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

  const fetchDiagrams = async () => {
    setIsTableLoading(true);
    setStatus({ type: null, message: '' });
    try {
        const response = await axios.get('https://n8n.paas.oracle-mty1.juanlopez.dev/webhook/cbff4cc2-f861-438b-b7dc-f8e6aafadea2');
        if (response.data && Array.isArray(response.data)) {
            setDiagrams(response.data);
            setStatus({ type: 'success', message: 'Lista de diagramas actualizada.' });
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        } else {
             throw new Error('La respuesta de la API no contiene el formato esperado (array)');
        }
    } catch (error: any) {
        setStatus({ type: 'error', message: `Error al cargar la lista de diagramas: ${error.message}` });
        setDiagrams([]);
    } finally {
        setIsTableLoading(false);
    }
  };


  useEffect(() => {
    if (containerRef.current) {
      const modeler = new BpmnModeler({
        container: containerRef.current,
        width: '100%',
        height: '500px'
      });

      setBpmnModeler(modeler);

      modeler.importXML(defaultBpmn).then(() => {
        setCurrentXml(defaultBpmn);
      }).catch((err: any) => {
        setStatus({ type: 'error', message: 'Error al inicializar el editor BPMN' });
        console.error('Error loading BPMN diagram:', err);
      });

      fetchDiagrams();

      return () => {
        modeler.destroy();
      };
    }
  }, []);

  const loadDataFromApi = async () => {
    if (!prompt.trim() && !pdfFile) {
      setStatus({ type: 'error', message: 'Por favor, escribe un prompt o carga un archivo PDF.' });
      return;
    }
     if (!email.trim()) {
      setStatus({ type: 'error', message: 'Por favor, ingresa un correo electrónico.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('email', email);
    if (pdfFile) {
        formData.append('file', pdfFile);
    }

    try {
      const response = await axios.post('https://n8n.paas.oracle-mty1.juanlopez.dev/webhook-test/45e467f9-acfe-4a19-ae92-6aebc46437d0', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 200) {
        setStatus({ type: 'success', message: 'Solicitud enviada exitosamente. El diagrama se procesará.' });
        setTimeout(() => setStatus({ type: null, message: '' }), 5000);
        setPrompt('');
        setEmail('');
        setPdfFile(null);
      } else {
        throw new Error(`La API respondió con el estado ${response.status}`);
      }
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: `Error al enviar la solicitud: ${error.response?.data?.message || error.message || 'Error desconocido'}`
      });
      console.error('Error sending request to API:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiagramFromTable = async (xml: string) => {
    if (!bpmnModeler || !xml) {
        setStatus({ type: 'error', message: 'No hay contenido XML para cargar.' });
        return;
    };
    try {
        await bpmnModeler.importXML(xml);
        setCurrentXml(xml);
        setStatus({ type: 'success', message: 'Diagrama cargado en el editor.' });
        setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (error) {
        setStatus({ type: 'error', message: 'Error al cargar el diagrama seleccionado.' });
        console.error('Error loading selected diagram:', error);
    }
  };

  const downloadXml = async () => {
    if (!bpmnModeler) return;

    try {
      const { xml } = await bpmnModeler.saveXML({ format: true });
      const blobXml = new Blob([xml], { type: 'application/xml' });
      const urlXml = URL.createObjectURL(blobXml);
      const aXml = document.createElement('a');
      aXml.href = urlXml;
      aXml.download = 'diagrama.bpmn';
      document.body.appendChild(aXml);
      aXml.click();
      document.body.removeChild(aXml);
      URL.revokeObjectURL(urlXml);
      setStatus({ type: 'success', message: 'Diagrama BPMN descargado exitosamente' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Error al descargar el diagrama BPMN' });
      console.error('Error downloading XML:', error);
    }

    try {
      const { svg } = await bpmnModeler.saveSVG();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const pngUrl = canvas.toDataURL('image/png');
            const aPng = document.createElement('a');
            aPng.href = pngUrl;
            aPng.download = 'diagrama.png';
            document.body.appendChild(aPng);
            aPng.click();
            document.body.removeChild(aPng);
            URL.revokeObjectURL(pngUrl);
        }
        URL.revokeObjectURL(svgUrl);
        setStatus({ type: 'success', message: 'Diagrama PNG descargado exitosamente' });
        setTimeout(() => setStatus({ type: null, message: '' }), 3000);
      };

      img.onerror = (error) => {
        console.error('Error al cargar SVG en la imagen:', error);
        setStatus({ type: 'error', message: 'No se pudo procesar la imagen del diagrama' });
        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      setStatus({ type: 'error', message: 'Error al descargar el diagrama PNG' });
      console.error('Error downloading PNG:', error);
    }
  };

  const handleBpmnUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !bpmnModeler) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const xml = e.target?.result as string;
        await bpmnModeler.importXML(xml);
        setCurrentXml(xml);
        setStatus({ type: 'success', message: 'Archivo BPMN cargado exitosamente' });
        setTimeout(() => setStatus({ type: null, message: '' }), 3000);
      } catch (error) {
        setStatus({ type: 'error', message: 'Error al cargar el archivo BPMN' });
        console.error('Error loading file:', error);
      }
    };
    reader.readAsText(file);
  };

  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setPdfFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Editor BPMN</h1>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              <span className="text-sm font-medium">Subir BPMN</span>
              <input type="file" accept=".bpmn,.xml" onChange={handleBpmnUpload} className="hidden" />
            </label>
            <button onClick={downloadXml} className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
              <Download className="h-4 w-4" />
              <span className="text-sm font-medium">Descargar</span>
            </button>
            <button onClick={loadDataFromApi} disabled={isLoading} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span className="text-sm font-medium">{isLoading ? 'Enviando...' : 'Enviar Prompt'}</span>
            </button>
          </div>
        </div>
      </div>

      {status.type && (
        <div className="px-6 py-2">
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${ status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800' }`}>
            {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        </div>
      )}

      <div className="flex" style={{ height: 'calc(100vh - 73px)'}}>
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Área de Prompts</h3>
            <div className="space-y-4">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Escribe aquí tu prompt para generar un diagrama BPMN..." className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu.correo@ejemplo.com" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <div>
                    <label className="flex items-center justify-center w-full space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg cursor-pointer transition-colors">
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm font-medium">{pdfFile ? pdfFile.name : 'Cargar PDF'}</span>
                        <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                    </label>
                </div>
            </div>
          </div>
          
          <div className="p-6 flex-grow flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-base font-semibold text-gray-800">Diagramas Guardados</h4>
                <button onClick={fetchDiagrams} disabled={isTableLoading} className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors">
                    {isTableLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
            </div>
            <div className="flex-grow overflow-y-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-2">ID</th>
                            <th scope="col" className="px-4 py-2 text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isTableLoading ? (
                            <tr><td colSpan={2} className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin inline-block"/></td></tr>
                        ) : diagrams.length > 0 ? (
                            diagrams.map((diagram) => (
                                <tr key={diagram._id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-2 font-mono text-xs text-gray-800 whitespace-nowrap">{diagram._id}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button onClick={() => loadDiagramFromTable(diagram.extractedXml)} className="font-medium text-blue-600 hover:underline disabled:text-gray-400" disabled={!diagram.extractedXml}>
                                            Cargar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={2} className="text-center p-4 text-gray-500">No se encontraron diagramas.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>

        </div>

        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Visor/Editor BPMN</h3>
            </div>
            <div className="p-4 flex-grow">
              <div ref={containerRef} className="w-full h-full border border-gray-300 rounded-lg" style={{ minHeight: '500px' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BpmnEditor;
