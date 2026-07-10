-- UP
CREATE TABLE BookingEquipmentItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    BookingRequestId UNIQUEIDENTIFIER NOT NULL,
    EquipmentId UNIQUEIDENTIFIER NOT NULL,
    RequestedQuantity INT NOT NULL DEFAULT 0,
    ReservedQuantity INT NOT NULL DEFAULT 0,
    BorrowedQuantity INT NOT NULL DEFAULT 0,
    ReturnedGoodQuantity INT NOT NULL DEFAULT 0,
    ReturnedBrokenQuantity INT NOT NULL DEFAULT 0,
    LostQuantity INT NOT NULL DEFAULT 0,
    HandoverCondition NVARCHAR(MAX) NULL,
    ReturnCondition NVARCHAR(MAX) NULL,
    Note NVARCHAR(MAX) NULL,
    CONSTRAINT FK_BookingEqItems_Booking FOREIGN KEY (BookingRequestId) REFERENCES BookingRequests(Id) ON DELETE CASCADE,
    CONSTRAINT FK_BookingEqItems_Equipment FOREIGN KEY (EquipmentId) REFERENCES Equipments(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_BookingEqItems_Request_Equipment UNIQUE (BookingRequestId, EquipmentId),
    CONSTRAINT CK_BookingEqItems_ReqQty CHECK (RequestedQuantity >= 0),
    CONSTRAINT CK_BookingEqItems_ResQty CHECK (ReservedQuantity >= 0),
    CONSTRAINT CK_BookingEqItems_BorQty CHECK (BorrowedQuantity >= 0),
    CONSTRAINT CK_BookingEqItems_RetGQty CHECK (ReturnedGoodQuantity >= 0),
    CONSTRAINT CK_BookingEqItems_RetBQty CHECK (ReturnedBrokenQuantity >= 0),
    CONSTRAINT CK_BookingEqItems_LostQty CHECK (LostQuantity >= 0)
);

-- DOWN
DROP TABLE IF EXISTS BookingEquipmentItems;
