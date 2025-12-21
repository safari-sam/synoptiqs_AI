# AI-Enhanced EHR System - Medatixx Challenge

AI-powered Electronic Health Record system with intelligent patient summaries for German medical practices. Built for the Medatixx "Seven and a Half Minutes" challenge.

## 🏥 Features

- **AI Patient Summaries**: OpenAI/Mistral-powered clinical decision support
- **Mock EHR System**: Complete patient management interface
- **GDT/BDT Integration**: German healthcare data exchange standards
- **MySQL Database**: Persistent patient data storage
- **FastAPI Backend**: High-performance Python API
- **Node.js Frontend**: Interactive EHR interface

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Git
- API keys (OpenAI or Mistral)

### Local Setup

1. **Clone the repository**
```bash
   git clone https://github.com/safari-sam/synoptiqs-docker_file
   cd Hackathon2
```

2. **Configure environment variables**
```bash
   cp .env.example .env
```
   
   Edit `.env` and add your API keys:
```env
   MISTRAL_API_KEY=your_actual_key_here
   OPENAI_API_KEY=your_actual_key_here
   DB_PASSWORD=your_secure_password
   JWT_SECRET=your_random_secret
```

3. **Start all services**
```bash
   docker-compose up -d
```

4. **Access the applications**
   - EHR Frontend: http://localhost:5000
   - AI API Docs: http://localhost:8001/docs
   - MySQL: localhost:3306

5. **Create your first account**
   - Go to http://localhost:5000
   - Click "Register here"
   - Create a doctor account
   - Log in and start managing patients!

### GitHub Codespaces

Click the "Code" button → "Codespaces" → "Create codespace on main"

Codespaces will automatically:
- Install Docker
- Set up the development environment
- Forward ports for easy access

Then run:
```bash
cp .env.example .env
# Edit .env with your API keys
docker-compose up -d
```

## 📁 Project Structure
```
Hackathon2/
├── AI_patient_summary/          # Python AI Backend
│   ├── backend.py               # FastAPI server
│   ├── bdt_parser.py           # GDT/BDT parser
│   ├── Dockerfile              # Python container config
│   └── requirements.txt        # Python dependencies
├── ehr-backend/                # Node.js Mock EHR
│   ├── server/                 # Express server
│   ├── Dockerfile              # Node container config
│   └── package.json            # Node dependencies
├── docker-compose.yml          # Orchestration config
├── .devcontainer/              # Codespaces config
│   └── devcontainer.json
├── .env.example                # Environment template
└── README.md                   # This file
```


## 🗄️ Database

- **Type**: MySQL 8.0
- **Database**: ehr_app
- **Port**: 3306
- **Persistent**: Data stored in Docker volume `mysql_data`

## 🔐 Security Notes

- Never commit `.env` file (contains API keys)
- Change default passwords in production
- Use strong JWT secrets
- API keys are passed via environment variables

## 🐛 Troubleshooting

### Services won't start
```bash
docker-compose down
docker-compose up -d --build
```

### Check logs for errors
```bash
docker-compose logs ai-backend
docker-compose logs ehr-backend
docker-compose logs mysql
```

### Port conflicts
Make sure ports 3306, 5000, and 8001 are not in use by other applications.

### Session expired on login
Register a new doctor account first before logging in.

## 📝 License

MIT License - See LICENSE file

## 👥 Contributors

- sammy safari - Health Informatics Student, Deggendorf Institute of Technology

## 🏆 Medatixx Challenge

This project was developed for the Medatixx "Seven and a Half Minutes" hackathon challenge, focusing on AI-enhanced clinical workflows for German medical practices.