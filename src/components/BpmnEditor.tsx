import React, { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/dist/bpmn-modeler.development.js';
import axios from 'axios';
import { FileText, Download, Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const BpmnEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bpmnModeler, setBpmnModeler] = useState<any>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [currentXml, setCurrentXml] = useState('');

  // Default BPMN diagram
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

  useEffect(() => {
    if (containerRef.current) {
      const modeler = new BpmnModeler({
        container: containerRef.current,
        width: '100%',
        height: '500px'
      });

      setBpmnModeler(modeler);
      
      // Load default diagram
      modeler.importXML(defaultBpmn).then(() => {
        setCurrentXml(defaultBpmn);
        setStatus({ type: 'success', message: 'Editor BPMN inicializado correctamente' });
        setTimeout(() => setStatus({ type: null, message: '' }), 3000);
      }).catch((err: any) => {
        setStatus({ type: 'error', message: 'Error al inicializar el editor BPMN' });
        console.error('Error loading BPMN diagram:', err);
      });

      return () => {
        modeler.destroy();
      };
    }
  }, []);

  const loadDataFromApi = async () => {
    if (!bpmnModeler || !prompt.trim()) {
      setStatus({ type: 'error', message: 'Por favor, escribe un prompt antes de generar el diagrama' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await axios.post('https://n8n.paas.oracle-mty1.juanlopez.dev/webhook-test/45e467f9-acfe-4a19-ae92-6aebc46437d0', {
        prompt: prompt.trim()
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0 && response.data[0].output && response.data[0].extractedXml) {
        const xmlContent = response.data[0].extractedXml;
        await bpmnModeler.importXML(xmlContent);
        setCurrentXml(xmlContent);
        setStatus({ type: 'success', message: 'Diagrama BPMN generado exitosamente desde el prompt' });
        setTimeout(() => setStatus({ type: null, message: '' }), 3000);
      } else {
        throw new Error('La respuesta de la API no contiene el formato esperado');
      }
    } catch (error: any) {
      setStatus({ 
        type: 'error', 
        message: `Error al generar diagrama: ${error.response?.data?.message || error.message || 'Error desconocido'}` 
      });
      console.error('Error generating diagram from API:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadXml = async () => {
    if (!bpmnModeler) return;

    try {
      const { xml } = await bpmnModeler.saveXML({ format: true });
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.bpmn';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus({ type: 'success', message: 'Diagrama descargado exitosamente' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Error al descargar el diagrama' });
      console.error('Error downloading XML:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              <input
                type="file"
                accept=".bpmn,.xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            <button
              onClick={downloadXml}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm font-medium">Descargar</span>
            </button>
            
            <button
              onClick={loadDataFromApi}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isLoading ? 'Generando...' : 'Generar Diagrama'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {status.type && (
        <div className="px-6 py-2">
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            status.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        </div>
      )}

      <div className="flex h-full">
        {/* Sidebar - Prompt Area */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Área de Prompts
            </h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Escribe aquí tu prompt para generar un diagrama BPMN. Ejemplo: 'Crear un proceso de aprobación de solicitudes con 3 pasos'"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="p-6 flex-1">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Información de la API
            </h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <span className="font-medium">Estado:</span> 
                <span className={`ml-2 ${currentXml ? 'text-green-600' : 'text-gray-400'}`}>
                  {currentXml ? 'Diagrama cargado' : 'Sin diagrama'}
                </span>
              </div>
              <div>
                <span className="font-medium">Método:</span>
                <span className="ml-2 text-blue-600 font-mono">POST</span>
              </div>
              <div>
                <span className="font-medium">Endpoint:</span>
                <div className="mt-1 p-2 bg-gray-50 rounded text-xs break-all">
                  https://n8n.paas.oracle-mty1.juanlopez.dev/webhook-test/45e467f9-acfe-4a19-ae92-6aebc46437d0
                </div>
              </div>
              <div>
                <span className="font-medium">Payload:</span>
                <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                  {`{ "prompt": "${prompt || 'tu prompt aquí'}" }`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Visor/Editor BPMN
              </h3>
            </div>
            <div className="p-4 h-full">
              <div 
                ref={containerRef} 
                className="w-full h-full border border-gray-300 rounded-lg"
                style={{ minHeight: '500px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BpmnEditor;