import React from 'react';
import { APP_VERSION, APP_NAME, AUTHOR } from '../utils/version';

export const About: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{APP_NAME}</h1>
          <p className="text-lg text-gray-600">AtPack Viewer & Device Explorer</p>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mt-2">
            Version {APP_VERSION}
          </div>
        </div>

        {/* Development Warning */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                ⚠️ Development Warning
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This project is currently in active development. Features may change between versions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Content Notice */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                ℹ️ AI-Generated Content Notice
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  A significant portion of this project's content (including code, comments and documentation) 
                  has been generated using AI assistance. Please review all code and documentation carefully 
                  before use in production environments. We recommend thorough testing and validation of any 
                  AI-generated components.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Author & License */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Author</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{AUTHOR}</p>
              <p className="text-gray-600 text-sm mt-1">Professeur agrégé PRAG (Higher Education) of applied physics & Electronics Enthusiast</p>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">License</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">Apache 2.0</p>
              <p className="text-gray-600 text-sm mt-1">Open source software, free to use and modify</p>
            </div>
          </div>
        </div>

        {/* Technical Information */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Technical Information</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Frontend Stack</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>React with TypeScript</li>
                  <li>Vite for fast development</li>
                  <li>Tailwind CSS for styling</li>
                  <li>Zustand for state management</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Supported Formats</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>ATDF (Atmel Target Description Format)</li>
                  <li>PDSC (Pack Description)</li>
                  <li>AtPack archives (.atpack)</li>
                  <li>ZIP-based package extraction</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Architecture</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Modular parser system</li>
                  <li>Type-safe data structures</li>
                  <li>Client-side processing</li>
                  <li>No server dependencies</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* About AtPack */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">About AtPack</h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-4">
              AtPack (Atmel Pack) files are package archives containing device descriptions, 
              header files, and support files for Atmel and Microchip microcontrollers. 
              These packages are essential for embedded development environments.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-blue-900 mb-2">What this application provides:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>Complete device information extraction from AtPack files</li>
                <li>Memory layout visualization and analysis</li>
                <li>Interactive lockbits and fuses configuration</li>
                <li>Peripheral registers with detailed descriptions</li>
                <li>Pinout diagrams and alternative functions</li>
                <li>Timer/Counter configuration with prescaler calculations</li>
                <li>Device signatures and identification</li>
                <li>Interrupt vector tables and descriptions</li>
              </ul>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-green-900 mb-2">How to use:</h3>
              <ol className="text-sm text-green-800 space-y-1">
                <li>Load an AtPack file using the sidebar selector</li>
                <li>Choose a device from the available options</li>
                <li>Explore the detailed information in the Device Information tab</li>
                <li>Use filters to show/hide specific information sections</li>
                <li>Configure timers, view pinouts, and analyze memory layouts</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Legal Information */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Legal Information</h2>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              <strong>Disclaimer:</strong> This application is an independent tool for viewing and analyzing 
              AtPack files. It is not affiliated with, endorsed by, or sponsored by Microchip Technology Inc. 
              or any of its subsidiaries.
            </p>
            
            <p>
              <strong>Trademarks:</strong> Atmel, AVR, and AtPack are trademarks of Microchip Technology Inc. 
              All other trademarks are the property of their respective owners.
            </p>
            
            <p>
              <strong>Data Sources:</strong> Device information is extracted from official AtPack files 
              provided by Microchip Technology. This application does not modify or redistribute the 
              original AtPack contents.
            </p>
            
            <p>
              <strong>Use at your own risk:</strong> While every effort has been made to ensure accuracy, 
              users should verify critical information against official documentation before making 
              design decisions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t mt-8 pt-6 text-center">
          <p className="text-sm text-gray-500">
            Made with ❤️ for the embedded development community
          </p>
        </div>
      </div>
    </div>
  );
};
