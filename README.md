# LDPC Graph Editor

A modern web application for designing, analyzing, and testing LDPC (Low-Density Parity-Check) codes with comprehensive graph editing capabilities and performance simulation.

## 🌟 Features

### 📊 Interactive Graph Construction (Tanner Graph)
- **Node Operations**: Add/delete bit nodes and check nodes with batch operations support
- **Connection Management**: Drag-and-drop connections, one-to-many linking, automatic invalid connection validation  
- **Template System**: Built-in standard code templates (Hamming(7,4), regular LDPC, etc.)
- **Smart Layout**: Horizontal, grid, circular, and other automatic arrangement options
- **Import/Export**: Save and load graph structures in JSON/GraphML formats

### 🔢 Matrix Generation & Editing
- **Auto Generation**: Automatically generate H-matrix and G-matrix from Tanner graphs
- **Manual Editing**: Support for manual matrix element editing with real-time synchronization
- **Visualization**: Matrix table display with density analysis and statistics
- **Format Export**: Export to CSV, TXT, and other formats

### 🔧 Multi-Algorithm Encoding/Decoding
- **Encoding**: Linear encoding computation and random codeword generation
- **Decoding Algorithms**:
  - Belief Propagation
  - Min-Sum Algorithm
  - Sum-Product Algorithm
  - Gallager-A/B Algorithms
  - Layered Decoding
- **Parameter Configuration**: Maximum iterations, scaling factors, damping coefficients, LLR input
- **Process Visualization**: Decoding iteration display and error bit highlighting

### 📡 Channel Simulation System
- **Channel Types**:
  - Binary Symmetric Channel (BSC)
  - Additive White Gaussian Noise (AWGN)
  - Soft-decision AWGN Channel
  - Binary Erasure Channel (BEC)
- **Simulation Configuration**: SNR range settings, frame count configuration, multi-point simulation
- **Performance Analysis**: BER/FER curve generation and theoretical capacity calculation

### 📈 In-depth Code Analysis
- **Basic Parameters**: Code length n, information bits k, code rate R, minimum distance d
- **Advanced Analysis**: Density analysis, regularity assessment, girth estimation
- **Performance Evaluation**: Theoretical efficiency, error correction capability, comparison with classical codes
- **Optimization Suggestions**: Structure optimization recommendations based on analysis results

### 🧪 Comprehensive Testing & Simulation
- **Error Injection**: Random errors, burst errors, configurable error rates
- **Performance Testing**: Multi-algorithm comparison, BER performance analysis, throughput testing
- **Statistical Reports**: Detailed test results, chart visualization, performance recommendations

### 🎓 Educational Support Features
- **Standard Code Templates**: Classical examples like Hamming codes, BCH codes, RS codes
- **Operation Guidance**: Step-by-step operation tips and help instructions
- **Parameter Comparison**: Performance comparison with theoretical limits and other codes
- **Educational Visualization**: Dynamic display of encoding/decoding processes

### 💾 Project Management System
- **Project Saving**: Complete preservation of graph structures, matrices, and configuration parameters
- **Version Control**: History tracking and version comparison
- **Batch Operations**: Batch node addition, automatic connection, layout alignment
- **Data Export**: Multi-format export of graphs, matrices, and simulation results

### 💻 Modern User Interface
- **Responsive Design**: Flexible layout adapting to different screen sizes
- **Dark Theme**: Professional eye-friendly dark interface design
- **Multi-panel Layout**: Clear separation of toolbar, editing area, and analysis panels
- **Real-time Feedback**: Instant operation results display and status updates
- **Quick Operations**: Keyboard shortcuts and right-click menu support

## 🏗️ Technology Stack

### Frontend
- **React 18**: Modern frontend framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **Styled-Components**: CSS-in-JS styling solution
- **Zustand**: Lightweight state management
- **React Flow Renderer**: Interactive graph visualization
- **Recharts**: Chart visualization library
- **Axios**: HTTP client

### Backend
- **Node.js**: JavaScript runtime environment
- **Express**: Web framework
- **TypeScript**: Type-safe server-side development
- **Math.js**: Mathematical computation library
- **CORS**: Cross-Origin Resource Sharing
- **Helmet**: Security middleware

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0

### Installation

```bash
# Option 1: Install all dependencies at once (Recommended)
npm run install:all

# Option 2: Install separately
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Development Server

```bash
# Option 1: Start both frontend and backend simultaneously (Recommended)
npm run dev

# Option 2: Start separately
# Start backend server (Port: 19876)
cd backend
npm run dev

# Start frontend development server (Port: 3000)
cd frontend  
npm run dev
```

### Production Build

```bash
# Option 1: Build both frontend and backend (Recommended)
npm run build

# Option 2: Build separately
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build

# Clean build artifacts
npm run clean
```

## 📖 Usage Guide

### 1. Creating LDPC Graphs
1. Select the "Bit Node" tool and click on the canvas to add bit nodes
2. Select the "Check Node" tool to add check nodes
3. Select the "Connection" tool and click between two different node types to connect them
4. Use the "Select" tool to move and adjust node positions

### 2. Generating Matrices
1. Ensure the graph passes validation (no isolated nodes, valid connections)
2. Click "Generate Matrix" in the right-side "Matrix" panel
3. View the generated H-matrix, G-matrix, and code parameters

### 3. Running Tests
1. Switch to the "Test" panel
2. Configure test parameters (error type, probability, test count, etc.)
3. Click "Start Test" to run simulation
4. View test results and performance analysis in the "Results" panel

## 🧮 Algorithm Implementation

### LDPC Encoding Algorithms
- Linear encoding based on generator matrix
- Systematic codeword generation
- Support for arbitrary code rate LDPC codes

### LDPC Decoding Algorithms
- Belief Propagation decoding
- Iterative soft-decision decoding
- Configurable maximum iteration count

### Performance Analysis
- Monte Carlo simulation
- BER performance curve generation
- Multiple error pattern support

## 🔧 API Endpoints

### Matrix Operations
- `POST /api/matrix/generate` - Generate H and G matrices
- `POST /api/matrix/analyze` - Analyze code parameters

### Coding Operations
- `POST /api/coding/encode` - LDPC encoding
- `POST /api/coding/decode` - LDPC decoding
- `POST /api/coding/decode-enhanced` - Enhanced decoding
- `POST /api/coding/channel-transmit` - Channel transmission
- `POST /api/coding/channel-capacity` - Channel capacity

### Testing Operations
- `POST /api/test/ber-analysis` - BER performance analysis
- `POST /api/test/algorithm-comparison` - Algorithm comparison
- `POST /api/test/channel-comparison` - Channel comparison

### Graph Operations
- `POST /api/graph/validate` - Validate graph structure
- `POST /api/graph/auto-connect` - Automatic connection

## 📚 Project Structure

```
project1/
├── frontend/                 # Frontend code
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── GraphEditor.tsx      # Graph editor
│   │   │   ├── MatrixPanel.tsx      # Matrix panel
│   │   │   ├── TestPanel.tsx        # Test panel
│   │   │   ├── ResultsPanel.tsx     # Results panel
│   │   │   ├── CodingPanel.tsx      # Coding panel
│   │   │   ├── ChannelSimulation.tsx # Channel simulation
│   │   │   └── ...                  # Other components
│   │   ├── stores/          # State management (Zustand)
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── vite.config.ts       # Vite configuration
│   └── package.json
├── backend/                  # Backend code
│   ├── src/
│   │   ├── routes/          # API routes
│   │   │   ├── coding.ts    # Coding API
│   │   │   ├── matrix.ts    # Matrix API
│   │   │   ├── test.ts      # Testing API
│   │   │   └── graph.ts     # Graph API
│   │   ├── services/        # Core business logic
│   │   │   ├── ldpcService.ts       # LDPC coding service
│   │   │   ├── decodingService.ts   # Decoding algorithm service
│   │   │   ├── channelService.ts    # Channel simulation service
│   │   │   └── testService.ts       # Testing service
│   │   ├── types/           # TypeScript type definitions
│   │   └── index.ts         # Application entry point
│   ├── tsconfig.json        # TypeScript configuration
│   └── package.json
├── package.json             # Root package management
├── backend_unit_tests.js    # Backend unit tests
└── README.md               # Project documentation
```

## 🧪 Testing

The project includes comprehensive unit tests for the backend services:

```bash
# Run unit tests
node backend_unit_tests.js
```

## 🤝 Contributing

We welcome Issues and Pull Requests to improve this project.

## 📄 License

MIT License

## 🔗 Related Resources

- [LDPC Code Theory](https://en.wikipedia.org/wiki/Low-density_parity-check_code)
- [Belief Propagation Algorithm](https://en.wikipedia.org/wiki/Belief_propagation)
- [Error Correction Code Theory](https://en.wikipedia.org/wiki/Error_correction_code)

## 📋 System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Browser**: Modern browsers with ES6+ support
- **Memory**: Minimum 4GB RAM recommended
- **Network**: Internet connection required for initial setup

## ⚡ Performance

- **Graph Rendering**: Optimized for graphs with 1000+ nodes
- **Matrix Operations**: Efficient sparse matrix computations
- **Simulation**: Parallel processing for large-scale BER simulations
- **Real-time Updates**: Sub-100ms response time for interactive operations

## 🛠️ Development

### Code Style
- ESLint configuration for consistent code formatting
- TypeScript strict mode enabled
- Prettier integration for automatic code formatting

### Architecture
- **Frontend**: Component-based architecture with React hooks
- **Backend**: RESTful API with Express.js
- **State Management**: Zustand for client-side state
- **Communication**: Axios for HTTP requests with error handling

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process on port 19876
   npx kill-port 19876
   ```

2. **Module Not Found**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **TypeScript Errors**
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   ```

For more issues, please check the [GitHub Issues](https://github.com/yourusername/ldpc-graph-editor/issues) page.
